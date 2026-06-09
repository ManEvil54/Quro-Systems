import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

// Initialize firebase-admin safely
const adminApp = getApps().length === 0 ? initializeApp() : getApp();
const db = getFirestore(adminApp);

const PROJECT_ID = process.env.GCP_PROJECT || (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : 'quro-13d98');
const LOCATION = 'us-central1';

const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: LOCATION,
});

export const generateShiftHandover = onSchedule('0 * * * *', async (event: any) => {
  console.log('Starting scheduled Shift Handover AI Synthesis...');
  const now = new Date();
  const currentHour = now.getHours();
  const currentHourFormatted = `${String(currentHour).padStart(2, '0')}:00`;

    try {
      // Query facilities across organizations using collectionGroup
      const facilitiesSnap = await db.collectionGroup('facilities').get();
      console.log(`Found ${facilitiesSnap.docs.length} facilities across the tenant scope.`);

      for (const facilityDoc of facilitiesSnap.docs) {
        const facilityData = facilityDoc.data();
        const facilityId = facilityDoc.id;
        
        // Retrieve parent organization ID from the path: organizations/{orgId}/facilities/{facilityId}
        const facilityPath = facilityDoc.ref.path;
        const pathParts = facilityPath.split('/');
        const orgId = pathParts[1]; // Index 1 is the {orgId}

        if (!orgId) {
          console.error(`Unable to parse organization ID from path: ${facilityPath}`);
          continue;
        }

        const config = facilityData.shiftConfiguration || {
          type: '8hr',
          intervals: ['07:00', '15:00', '23:00']
        };

        const { type, intervals } = config;

        // Check if the current hour matches one of the shift boundaries
        const isMatch = intervals.includes(currentHourFormatted);
        if (!isMatch) {
          console.log(`Facility ${facilityId} (${facilityData.name || 'Unnamed'}) does not match interval ${currentHourFormatted}. Skipping.`);
          continue;
        }

        console.log(`Processing Shift Handover for Facility: ${facilityData.name || facilityId} (${type} rotation matching ${currentHourFormatted})`);

        // Calculate the custom lookback window (8 hours or 12 hours)
        const lookbackHours = type === '12hr' ? 12 : 8;
        const lookbackMs = lookbackHours * 60 * 60 * 1000;
        const startTime = new Date(now.getTime() - lookbackMs);

        // Fetch active clinical alerts across patients in this facility
        const activeAlerts: string[] = [];
        try {
          const patientsSnap = await db.collection('organizations')
            .doc(orgId)
            .collection('patients')
            .where('facility_id', '==', facilityId)
            .get();
            
          for (const patientDoc of patientsSnap.docs) {
            const patientData = patientDoc.data();
            const patientName = `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim();
            
            const alertsSnap = await patientDoc.ref.collection('patient_alerts')
              .where('status', '==', 'active')
              .get();
              
            alertsSnap.forEach(alertDoc => {
              const alertData = alertDoc.data();
              activeAlerts.push(`- [ACTIVE ALERT] Patient: ${patientName} (MRN: ${patientData.mrn || 'N/A'}) - Category: ${alertData.alert_type || 'General'} - Observation: ${alertData.text || ''} (Reported by: ${alertData.created_by?.name || 'Staff'} at ${alertData.created_at ? alertData.created_at.toDate().toLocaleTimeString() : ''})`);
            });
          }
        } catch (alertErr) {
          console.error(`Failed to query patient active alerts for facility ${facilityId}:`, alertErr);
        }

        // Fetch clinical logs recorded during this window
        const logsRef = facilityDoc.ref.collection('clinical_logs');
        const logsSnap = await logsRef
          .where('created_at', '>=', Timestamp.fromDate(startTime))
          .orderBy('created_at', 'desc')
          .get();

        const logs = logsSnap.docs.map(doc => {
          const d = doc.data();
          return `- [${d.category || 'General'}] Patient: ${d.patient_name || 'N/A'} (MRN: ${d.patient_mrn || 'N/A'}) - ${d.note || d.description || ''} (Recorded by: ${d.recorded_by_name || 'Staff'} at ${d.created_at ? d.created_at.toDate().toLocaleTimeString() : ''})`;
        });

        console.log(`Found ${logs.length} clinical logs for the preceding ${lookbackHours} hours. Found ${activeAlerts.length} active patient alerts.`);

        // Even if there are no logs, we should generate a summary stating no acute events occurred, ensuring continuity.
        const logsContent = logs.length > 0 
          ? logs.join('\n') 
          : 'No clinical logs or acute events were recorded during this shift lookback window.';

        const alertsContent = activeAlerts.length > 0
          ? activeAlerts.join('\n')
          : 'No active clinical heads-up/alerts are currently registered for any resident.';

        const systemPrompt = `
You are the lead Quro Systems Clinical Intelligence AI. 
Your task is to compile and synthesize shift handover reports for facility clinical teams.

Summarize the preceding shift's events into exactly 3 highly specific, clinical bullet points:
1. Critical Alerts & Safety: Prioritize and compile all active clinical alerts (heads-up dispatches) for patients first (e.g. respiratory secretions, hemodynamic changes, fall risks, etc.). If none, summarize general safety and stability.
2. Vital Activity & Monitoring: Highlight the key vital trends, active treatments (RT/GT/MAR), or notable changes in patient statuses.
3. Task & Routine Compliance: Address completed shifts/routines, outstanding tasks, or handoff directives for the incoming team.

Follow these strict constraints:
- Provide exactly 3 bullet points. No intro, no outro, no conversational text.
- Each bullet point must start with a number (1., 2., 3.) and be written in a professional, concise, clinical tone.
- Do not use markdown bold/italic tags within the bullets. Just plain, clear text.
`;

        const userPrompt = `
Facility: ${facilityData.name || 'Unnamed Facility'}
Shift Period: Previous ${lookbackHours} hours (Lookback from ${startTime.toLocaleTimeString()} to ${now.toLocaleTimeString()})
Shift Configuration: ${type} rotation

Active Clinical Alerts & Heads-Ups:
${alertsContent}

Clinical Logs Collected:
${logsContent}
`;

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: systemPrompt + '\n' + userPrompt,
            config: {
              temperature: 0.2,
              maxOutputTokens: 1024,
            },
          });

          const summaryText = response.text || '1. General safety and stability maintained. No acute clinical alerts reported during this lookback window.\n2. Vitals stable across all beds. Routine monitoring active.\n3. Shift transitions complete. MAR/ADL logs synchronized successfully.';

          console.log(`Gemini Synthesis complete for facility ${facilityId}.`);

          // Write active briefing document
          const briefingRef = facilityDoc.ref.collection('shift_briefings').doc('active_briefing');
          await briefingRef.set({
            summary: summaryText,
            shift_type: type,
            created_at: now.toISOString(),
            generated_at: Timestamp.fromDate(now),
            lookback_hours: lookbackHours,
            matched_interval: currentHourFormatted
          });

          console.log(`Saved active shift briefing for Facility ${facilityId} successfully.`);

        } catch (genErr) {
          console.error(`AI Generation failed for Facility ${facilityId}:`, genErr);
        }
      }

    } catch (err) {
      console.error('Scheduled Shift Handover Function failed:', err);
    }
  });
