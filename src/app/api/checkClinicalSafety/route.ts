import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  vertexai: {
    project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'quro-13d98',
    location: 'us-central1',
  }
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { medication_list, allergies, diagnoses } = body as {
      medication_list: string[];
      allergies: string[];
      diagnoses: string[];
    };

    if (!medication_list || !Array.isArray(medication_list)) {
      return NextResponse.json({ error: 'medication_list array is required' }, { status: 400 });
    }

    // 1. Fetch drug-to-drug interactions from NIH RxNav
    let interactionData = null;
    const rxcuis = medication_list.filter(Boolean); // Clean any nulls
    if (rxcuis.length > 1) {
      try {
        const rxUrl = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`;
        const rxRes = await fetch(rxUrl);
        if (rxRes.ok) {
          interactionData = await rxRes.json();
        }
      } catch (err) {
        console.error('Error fetching RxNav Interactions:', err);
      }
    }

    // 2. Prepare payload for Gemini 1.5 Flash
    const prompt = `
You are an expert clinical pharmacologist. Review the following patient profile and identify any high-risk allergy contraindications or severe drug-to-drug interactions.

Patient Diagnoses: ${diagnoses?.join(', ') || 'None provided'}
Patient Allergies: ${allergies?.join(', ') || 'No known allergies'}
Current Medications (RxCUIs): ${rxcuis.join(', ')}
NIH RxNav Interaction Data: ${interactionData ? JSON.stringify(interactionData) : 'None'}

Return a strictly typed JSON object containing:
1. "severity": String enum of "low", "medium", or "high". 
   - Use "high" for severe allergy risks or life-threatening drug-drug interactions.
   - Use "medium" for moderate interactions requiring monitoring.
   - Use "low" if safe.
2. "rationale": A concise 1-sentence explanation of the risk.
3. "clinicalRecommendation": A short, direct recommendation for the clinician.

Output ONLY valid JSON. No markdown backticks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const aiText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const parsed = JSON.parse(aiText);

    return NextResponse.json(parsed);

  } catch (error: unknown) {
    console.error('Clinical Safety Check Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
