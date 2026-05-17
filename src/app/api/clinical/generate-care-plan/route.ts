import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

/**
 * Quro — Neural CLHF Care Plan Generator
 * Objective: Instantiate structured care plans utilizing patient intake & clinical diagnostics.
 * Engine: Gemini 1.5 Flash (Vertex AI)
 */

const PROJECT_ID = 'quro-13d98';
const LOCATION = 'us-central1';

const ai = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: LOCATION,
});

const SYSTEM_PROMPT = `
You are an expert Clinical Director of Nursing (DON) and clinical scribe specializing in Congregate Living Health Facilities (CLHF).
Your task is to generate a comprehensive, highly relevant, and regulatory-compliant preliminary clinical Care Plan for a newly admitted resident.

Congregate Living Health Facilities serve patients with high-acuity needs (e.g. ventilator-dependent, tracheostomy, spinal cord or brain injuries, neuromuscular disorders, severe dysphagia).

Generate exactly three Care Plan Cards:
1. Respiratory Management
2. Skin & Tissue Integrity
3. ADLs & Mobility

For each card, you must provide:
- A clinical Problem Statement that is patient-specific and incorporates their specific diagnoses and active risks.
- 2 to 3 SMART Goals (Specific, Measurable, Achievable, Relevant, Time-Bound) that contain objective metrics (e.g., maintain SpO2 >= 94% on nasal cannula at 2LPM continuously, zero signs of skin breakdown or new redness over the next 90 days, ambulates 50 feet with rolling walker daily by next evaluation).
- 3 to 5 clear, direct, and actionable Interventions.
- A recommended clinical Schedule (e.g. Q2H, Q4H, Shiftly, Daily, PRN).

IMPORTANT: You must return the response ONLY as a valid JSON object matching the following structure:
{
  "cards": [
    {
      "id": "respiratory" | "skin" | "adl",
      "title": string,
      "problem_statement": string,
      "goals": string[],
      "interventions": string[],
      "schedule": string
    }
  ]
}

Ensure the output is pure JSON. Do not include markdown code block wrappers (like \`\`\`json ... \`\`\`), do not include any preamble or extra text. Just the raw, valid JSON.
`;

export async function POST(req: Request) {
  try {
    const { patient, confirmedDiagnosis, baselines, notes } = await req.json();

    if (!patient) {
      return NextResponse.json({ error: 'Missing patient profile details' }, { status: 400 });
    }

    const patientAge = patient.date_of_birth 
      ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() 
      : 'Unknown';

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
    } catch (parseErr) {
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
