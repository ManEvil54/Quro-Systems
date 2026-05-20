'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Pill } from 'lucide-react';
import type { MedRoute, MedFrequency } from '@/lib/firebase/types';

export interface MedDetails {
  generic_name: string;
  brand_name: string;
  rxcui: string | null;
  strength: string;
  dose: string;
  dosage: string;
  route: MedRoute;
  frequency: MedFrequency;
  frequency_times: string[];
  strengthsList?: string[];
}

interface MedSuggestion {
  displayName: string;
  genericName: string;
  strengthsList: string[];
  rxcui: string | null;
}

interface Props {
  value: string;
  onChange: (name: string, rxcui: string | null, details?: MedDetails) => void;
  placeholder?: string;
  className?: string;
}

export default function MedicationPicker({ value, onChange, placeholder = "Search medication...", className = "" }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MedSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const skipNextFetch = useRef(false);

  const [prevValue, setPrevValue] = useState(value);

  // Sync internal query state if parent value changes externally during render
  if (value !== prevValue) {
    setQuery(value);
    setPrevValue(value);
  }

  useEffect(() => {
    if (value !== prevValue) {
      skipNextFetch.current = true;
    }
  }, [value, prevValue]);

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
    if (!query || query.length < 3) {
      return;
    }

    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(query)}&ef=STRENGTHS_AND_FORMS,RXCUIS`
        );
        const data = await response.json();
        const rawNames = data[1] || [];
        const extraFields = data[2] || {};
        const strengthsList = extraFields.STRENGTHS_AND_FORMS || [];
        const rxcuis = extraFields.RXCUIS || [];

        const suggestionsObj = rawNames.map((name: string, idx: number) => ({
          displayName: name,
          genericName: name.split(' (')[0],
          strengthsList: strengthsList[idx] || [],
          rxcui: rxcuis[idx]?.[0] || null
        }));

        setSuggestions(suggestionsObj.slice(0, 10));
        setIsOpen(true);
      } catch (err) {
        console.error('Error fetching RxNav suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (suggestion: MedSuggestion) => {
    skipNextFetch.current = true;
    
    const displayName = suggestion.displayName;
    const genericName = suggestion.genericName;
    
    setQuery(genericName);
    setIsOpen(false);
    
    // Route mapping
    let route: MedRoute = 'PO';
    const lowerName = displayName.toLowerCase();
    if (lowerName.includes('sublingual') || lowerName.includes('sl')) {
      route = 'SL';
    } else if (lowerName.includes('inhalation') || lowerName.includes('inh')) {
      route = 'INH';
    } else if (lowerName.includes('topical') || lowerName.includes('top') || lowerName.includes('cream') || lowerName.includes('ointment')) {
      route = 'TOP';
    } else if (lowerName.includes('ophthalmic') || lowerName.includes('oph') || lowerName.includes('eye')) {
      route = 'OPH';
    } else if (lowerName.includes('patch')) {
      route = 'PATCH';
    } else if (lowerName.includes('injection') || lowerName.includes('inj') || lowerName.includes('subcutaneous') || lowerName.includes('sc')) {
      route = 'SC';
    } else if (lowerName.includes('intravenous') || lowerName.includes('iv')) {
      route = 'IV';
    } else if (lowerName.includes('intramuscular') || lowerName.includes('im')) {
      route = 'IM';
    } else if (lowerName.includes('rectal') || lowerName.includes('pr')) {
      route = 'PR';
    }

    // Strength and Dose parsing
    let strength = '';
    let dose = '';
    let dosage = '1 Tablet';
    const strengthsList = (suggestion.strengthsList || []).map((s: string) => s.trim());

    if (strengthsList.length > 0) {
      const firstStrength = strengthsList[0];
      strength = firstStrength;
      
      // Parse numerical dose
      const doseMatch = firstStrength.match(/^([\d\.\-]+)\s*(mg|mcg|ml|g|%)/i);
      if (doseMatch) {
        dose = doseMatch[0].trim();
      } else {
        const parts = firstStrength.split(/\s+/);
        if (parts.length > 1) {
          dose = parts.slice(0, -1).join(' ');
        } else {
          dose = firstStrength;
        }
      }

      // Parse dosage form/qty
      const lowerStr = firstStrength.toLowerCase();
      if (lowerStr.includes('tab')) {
        dosage = '1 Tablet';
      } else if (lowerStr.includes('cap')) {
        dosage = '1 Capsule';
      } else if (lowerStr.includes('sol') || lowerStr.includes('liq') || lowerStr.includes('susp')) {
        dosage = '5 mL';
      } else if (lowerStr.includes('inh') || lowerStr.includes('aer') || lowerStr.includes('puffer')) {
        dosage = '1 Puffer';
      } else if (lowerStr.includes('patch')) {
        dosage = '1 Patch';
      }
    }

    const details: MedDetails = {
      generic_name: genericName,
      brand_name: '',
      rxcui: suggestion.rxcui,
      strength: strength,
      dose: dose,
      dosage: dosage,
      route: route,
      frequency: 'QD',
      frequency_times: ['09:00'],
      strengthsList: strengthsList
    };

    onChange(genericName, suggestion.rxcui, details);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(true);
            onChange(val, null); // Clear rxcui if they manually edit
            if (!val || val.length < 3) {
              setSuggestions([]);
            }
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
                {suggestion.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
