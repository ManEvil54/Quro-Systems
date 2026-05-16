import { VertexAI } from '@google-cloud/vertexai';
import { NextResponse } from 'next/server';

/**
 * Quro — Neural Clinical Synthesis
 * Objective: Convert raw medical dictation into structured SOAP notes.
 * Engine: Gemini 1.5 Flash (Vertex AI)
 */

const PROJECT_ID = 'quro-13d98';
const LOCATION = 'us-central1';

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.2, // Low temperature for high clinical precision
  },
});

const SYSTEM_PROMPT = `
You are an expert Clinical Scribe. Your task is to convert raw, conversational clinical dictation into a professional, structured SOAP note.

Follow these strict rules:
1. S (Subjective): Capture patient reports, complaints, and subjective feelings mentioned.
2. O (Objective): Extract measurable data, including full vital signs (BP, Heart Rate, Temp, Resp, SpO2, Glucose, Pain Level, Weight), physical findings, and observed behaviors.
3. A (Assessment): Synthesize the current clinical status based on the input.
4. P (Plan): List intended interventions, monitoring requirements, or medication changes mentioned.

Structure the output as:
S: [Content]
O: [Content]
A: [Content]
P: [Content]

If a category has no relevant information, provide a brief "No acute findings noted" or similar professional placeholder. 
Remove all conversational filler ("um", "ah", "like"). Use clinical terminology.
`;

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });
    }

    const prompt = `Dictation to synthesize:\n\n"${transcript}"`;

    const result = await generativeModel.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n' + prompt }] }
      ],
    });

    const response = await result.response;
    const formattedNote = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate note.';

    return NextResponse.json({ formattedNote });
  } catch (err) {
    const error = err as Error;
    console.error('Synthesis Error:', error);
    return NextResponse.json({ 
      error: 'Clinical Synthesis Failed', 
      details: error.message 
    }, { status: 500 });
  }
}
