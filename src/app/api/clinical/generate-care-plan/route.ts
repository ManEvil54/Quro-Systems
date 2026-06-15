import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

/**
 * Quro — Neural CLHF Care Plan Generator
 * Objective: Instantiate structured care plans utilizing patient intake & clinical diagnostics.
 * Engine: Gemini 1.5 Flash (Vertex AI)
 */

const PROJECT_ID = 'quro-13d98';
const LOCATION = 'us-central1';

const SYSTEM_PROMPT = `
You are an expert Clinical Director of Nursing (DON) and clinical scribe specializing in Congregate Living Health Facilities (CLHF).
Your task is to generate a comprehensive, highly relevant, and regulatory-compliant preliminary clinical Care Plan for a newly admitted resident.

Congregate Living Health Facilities serve patients with high-acuity needs (e.g. ventilator-dependent, tracheostomy, spinal cord or brain injuries, neuromuscular disorders, severe dysphagia).

Generate a Care Plan consisting of structured Care Plan Cards. The cards generated MUST be tailored to the resident's specific clinical profile.

You must generate:
1. Respiratory Management (id: "respiratory", category: "respiratory", title: "Respiratory Management")
2. Skin & Tissue Integrity (id: "skin", category: "skin", title: "Skin & Tissue Integrity")
3. ADLs & Mobility (id: "adl", category: "adl", title: "ADLs & Mobility")

And you MUST automatically scan the patient profile and active medication list to include the following additional cards if applicable:
4. Psychotropic Monitoring (id: "psychotropic", category: "psychotropic", title: "Psychotropic Monitoring")
   - MUST generate this card if the active medication list contains any psychotropic medication (e.g., Zyprexa, Olanzapine, Haldol, Haloperidol, Seroquel, Quetiapine, Ativan, Lorazepam, Risperdal, Risperidone, Geodon, Abilify, Valium, Xanax, Restoril, etc., or any medication marked with "Psychotropic: Yes").
   - Focus: Target behaviors/symptoms of the medication, monitoring for adverse effects, extrapyramidal symptoms (EPS), tardive dyskinesia, and scheduling AIMS (Abnormal Involuntary Movement Scale) testing.
5. Nutrition & Weight Management (id: "nutrition-weight", category: "nutrition-weight", title: "Nutrition & Weight Management")
   - Generate if the resident has a G-Tube/enteral state, dysphagia, or other nutrition-related baseline indicators.
   - Focus: Maintaining weight, dietary specifications, aspiration precautions.
6. Fall Risk Management (id: "fall-risk", category: "fall-risk", title: "Fall Risk Management")
   - Generate if "fall_risk" or "High Fall Risk" is listed in baseline indicators or primary diagnoses, or patient has active mobility impairments.
   - Focus: Safe transfers, fall prevention precautions.
7. Cognitive & Dementia Care (id: "cognitive", category: "cognitive", title: "Cognitive & Dementia Care")
   - Generate if the patient has a primary diagnosis of Dementia, Alzheimer's, Lewy Body Dementia, or cognitive impairment.
   - Focus: Memory support, redirecting, safe environment.

Each Care Plan Card must contain:
- A clinical focus/problem statement (string) that is patient-specific and incorporates their specific diagnoses, active risks, and medications.
- 2 to 3 SMART Goals (Specific, Measurable, Achievable, Relevant, Time-Bound) as objects containing text and target date. Target dates should be set to exactly 90 days from the current date (e.g., "2026-09-14").
- 3 to 5 clear, direct, and actionable Interventions as objects containing text and discipline (e.g., "Nursing", "CNA", "PT/OT", "Dietary", "MD").
- A recommended clinical Schedule (e.g. Q2H, Q4H, Shiftly, Daily, PRN).

IMPORTANT: You must return the response ONLY as a valid JSON object matching the following structure:
{
  "cards": [
    {
      "id": string,
      "category": string,
      "title": string,
      "focus": string,
      "goals": [
        { "text": string, "target_date": string }
      ],
      "interventions": [
        { "text": string, "discipline": string }
      ],
      "schedule": string,
      "status": "active"
    }
  ]
}

Ensure the output is pure JSON. Do not include markdown code block wrappers (like \`\`\`json ... \`\`\`), do not include any preamble or extra text. Just the raw, valid JSON.
`;

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: LOCATION,
    });

    const { patient, confirmedDiagnosis, baselines, notes, medications } = await req.json();

    if (!patient) {
      return NextResponse.json({ error: 'Missing patient profile details' }, { status: 400 });
    }

    const patientAge = patient.date_of_birth 
      ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() 
      : 'Unknown';

    const activeMedsInfo = Array.isArray(medications)
      ? medications
          .filter((m: any) => m.status === 'active')
          .map((m: any) => `- ${m.generic_name} ${m.strength || ''} (Route: ${m.route || ''}, Freq: ${m.frequency || ''}, Psychotropic: ${m.is_psychotropic ? 'Yes' : 'No'}, Indication: ${m.indication || 'Not listed'})`)
          .join('\n')
      : 'None active or listed';

    const userPrompt = `
Generate a preliminary CLHF clinical Care Plan based on the following profile:

Resident Profile:
- Name: ${patient.first_name} ${patient.last_name}
- Age: ${patientAge}
- Gender: ${patient.gender || 'Unknown'}
- Primary Diagnoses from chart: ${patient.diagnoses?.join(', ') || 'None listed'}
- Code Status: ${patient.code_status || 'Full Code'}
- Active Respiratory Status: ${patient.respiratory_state ? JSON.stringify(patient.respiratory_state) : 'Not documented'}
- Active Enteral G-Tube Status: ${patient.enteral_state ? JSON.stringify(patient.enteral_state) : 'Not documented'}
- Active Medication List:
${activeMedsInfo}

Intake / Admitting Nurse Inputs:
- Confirmed Clinical Admitting Diagnosis: ${confirmedDiagnosis || 'No custom diagnosis entered'}
- High-Risk Baseline Clinical Indicators Selected: ${baselines?.join(', ') || 'None selected'}
- Nurse Focus & Directives: ${notes || 'No custom directives provided'}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: SYSTEM_PROMPT + '\n' + userPrompt,
      config: {
        temperature: 0.25,
        maxOutputTokens: 2048,
      },
    });

    let text = response.text || '';

    // Robust cleaning: strip markdown code blocks if the model returns them anyway
    text = text.trim();
    if (text.startsWith('```')) {
      // Remove starting marker
      text = text.replace(/^```(json)?/, '');
      // Remove ending marker
      text = text.replace(/```$/, '');
      text = text.trim();
    }

    // Attempt to parse to verify correctness
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      console.error('Failed to parse model output directly. Output was:', text);
      throw new Error('Model did not return a valid structured JSON output.');
    }

    return NextResponse.json(parsedData);
  } catch (err) {
    const error = err as Error;
    console.error('Care Plan Generation Error:', error);
    return NextResponse.json({ 
      error: 'Clinical Synthesis Failed', 
      details: error.message 
    }, { status: 500 });
  }
}
