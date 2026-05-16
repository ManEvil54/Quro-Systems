// ============================================================
// Quro — Voice-to-Structured-SOAP
// AI-driven clinical documentation assistant
// ============================================================
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  Square, 
  Loader2, 
  AlertCircle
} from 'lucide-react';

interface VoiceToSOAPProps {
  onTranscribed: (formattedText: string) => void;
}

// Sub-component for premium clinical waveform
const NeuralWaveform = () => {
  const bars = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    id: i,
    height: 40 + (i * 10) % 60,
    delay: i * 0.1,
    duration: 0.5 + (i * 0.05)
  })), []);

  return (
    <div className="flex gap-0.5 items-center h-4">
      {bars.map(bar => (
        <div 
          key={bar.id} 
          className="w-0.5 bg-quro-teal rounded-full animate-bounce" 
          style={{ 
            height: `${bar.height}%`,
            animationDuration: `${bar.duration}s`,
            animationDelay: `${bar.delay}s` 
          }} 
        />
      ))}
    </div>
  );
};

// Type definitions for Web Speech API
interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  start: () => void;
  stop: () => void;
}

export default function VoiceToSOAP({ onTranscribed }: VoiceToSOAPProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition() as ISpeechRecognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: { error: string }) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      const t = setTimeout(() => {
        setError('Speech recognition not supported in this browser.');
      }, 0);
      return () => clearTimeout(t);
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
    setError(null);
    try {
      const response = await fetch('/api/clinical/synthesize-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) throw new Error('Neural Synthesis Failed');
      
      const { formattedNote } = await response.json();
      
      onTranscribed(formattedNote);
      setTranscript('');
    } catch (err) {
      const errorObj = err as Error;
      console.error('Synthesis Error:', errorObj.message);
      setError('Clinical Intelligence Error: Synthesis Failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {isRecording ? (
        <button 
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-3 px-6 py-3 bg-rose-500 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase animate-pulse shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all"
        >
          <Square size={14} fill="currentColor" />
          Stop & Format
        </button>
      ) : (
        <button 
          type="button"
          onClick={startRecording}
          disabled={isProcessing}
          className="flex items-center gap-3 px-6 py-3 bg-quro-teal text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-quro-teal/20 hover:bg-teal-600 transition-all disabled:opacity-50 group"
        >
          {isProcessing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Mic size={14} className="group-hover:scale-110 transition-transform" />
          )}
          {isProcessing ? 'Synthesizing...' : 'Voice-to-SOAP'}
        </button>
      )}

      {isRecording && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl animate-in fade-in slide-in-from-left-2">
          <NeuralWaveform />
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
