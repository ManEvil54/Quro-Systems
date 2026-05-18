'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Pill } from 'lucide-react';

interface Props {
  value: string;
  onChange: (name: string, rxcui: string | null) => void;
  placeholder?: string;
  className?: string;
}

export default function MedicationPicker({ value, onChange, placeholder = "Search medication...", className = "" }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal query state if parent value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 3 || query === value) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        const results = data?.suggestionGroup?.suggestionList?.suggestion || [];
        setSuggestions(results.slice(0, 10));
        setIsOpen(true);
      } catch (err) {
        console.error('Error fetching RxNav suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, value]);

  const handleSelect = async (name: string) => {
    setQuery(name);
    setIsOpen(false);
    
    // Fetch RxCUI
    try {
      const rxRes = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}`);
      const rxData = await rxRes.json();
      const rxcui = rxData?.idGroup?.rxnormId?.[0] || null;
      onChange(name, rxcui);
    } catch (err) {
      console.error('Error fetching RxCUI:', err);
      onChange(name, null);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            onChange(e.target.value, null); // Clear rxcui if they manually edit
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-200 rounded-xl p-4 pl-12 text-sm font-bold text-slate-900 outline-none focus:border-quro-teal focus:ring-4 focus:ring-quro-teal/10 transition-all ${className}`}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 size={18} className="animate-spin text-quro-teal" /> : <Search size={18} />}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-teal-50 focus:bg-teal-50 border-b border-slate-50 last:border-0 transition-all group outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-white group-focus:bg-white flex items-center justify-center text-slate-400 group-hover:text-quro-teal group-focus:text-quro-teal transition-all">
                <Pill size={14} />
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-quro-teal group-focus:text-quro-teal transition-colors capitalize">
                {suggestion}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
