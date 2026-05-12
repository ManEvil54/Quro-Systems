// ============================================================
// Quro — Voice-to-Structured-SOAP
// AI-driven clinical documentation assistant
// ============================================================
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Wand2, 
  Loader2, 
  AlertCircle, 
  Check,
  BrainCircuit,
  Volume2
} from 'lucide-react';

interface VoiceToSOAPProps {
  onTranscribed: (formattedText: string) => void;
}

export default function VoiceToSOAP({ onTranscribed }: VoiceToSOAPProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsRecording(false);
      };
    } else {
      setError('Speech recognition not supported in this browser.');
    }
  }, []);

  const startRecording = () => {
    setError(null);
    setTranscript('');
    setIsRecording(true);
    recognitionRef.current?.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    recognitionRef.current?.stop();
    processWithAI();
  };

  const processWithAI = async () => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    try {
      // simulate AI processing - In production, this calls Gemini 1.5 Flash
      // Prompt: "Convert the following raw clinical dictation into a structured SOAP note: [Transcript]"
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const soapFormatted = `S: Resident reports ${transcript.toLowerCase()} during the shift.\nO: Alert and oriented, vitals stable. No acute distress observed.\nA: Tolerating current care plan; stable condition.\nP: Continue current interventions and monitoring.`;
      
      onTranscribed(soapFormatted);
      setTranscript('');
    } catch (err) {
      setError('Failed to process clinical intelligence.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {isRecording ? (
        <button 
          onClick={stopRecording}
          className="flex items-center gap-3 px-6 py-3 bg-rose-500 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase animate-pulse shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
        >
          <Square size={14} fill="currentColor" />
          Stop & Format
        </button>
      ) : (
        <button 
          onClick={startRecording}
          disabled={isProcessing}
          className="flex items-center gap-3 px-6 py-3 bg-quro-teal text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-quro-teal/20 hover:bg-teal-600 transition-all disabled:opacity-50 group"
        >
          {isProcessing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Mic size={14} className="group-hover:scale-110 transition-transform" />
          )}
          {isProcessing ? 'Thinking...' : 'Voice-to-SOAP'}
        </button>
      )}

      {isRecording && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl animate-in fade-in slide-in-from-left-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-0.5 h-3 bg-quro-teal animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">
            {transcript || 'Listening...'}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-widest">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
