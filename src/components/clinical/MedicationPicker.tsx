'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Pill } from 'lucide-react';
import type { MedRoute, MedFrequency } from '@/lib/firebase/types';
import { COMMON_DRUGS } from '@/lib/constants/drugs';

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
    if (!query || query.length < 2) {
      setSuggestions(s => s.length > 0 ? [] : s);
      setIsOpen(o => o ? false : o);
      return;
    }

    // 1. Instant local search from COMMON_DRUGS (zero-latency feedback)
    const queryLower = query.toLowerCase();
    const localMatches: MedSuggestion[] = COMMON_DRUGS.filter(d =>
      d.generic.toLowerCase().includes(queryLower) ||
      (d.brand && d.brand.toLowerCase().includes(queryLower))
    ).map(d => ({
      displayName: d.brand ? `${d.generic} (${d.brand})` : d.generic,
      genericName: d.generic,
      strengthsList: d.common_dosages || ['5mg', '10mg', '20mg', '50mg', '100mg'],
      rxcui: null
    }));

    setSuggestions(localMatches);
    if (localMatches.length > 0) {
      setIsOpen(true);
    }

    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    // 2. Debounced background call to extended NIH RxTerms API
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/medications/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        
        const merged = [...localMatches];
        const existingGenerics = new Set(merged.map(m => m.genericName.toLowerCase()));
        
        for (const apiTerm of (data.terms || [])) {
          if (!existingGenerics.has(apiTerm.genericName.toLowerCase())) {
            merged.push({
              displayName: apiTerm.displayName,
              genericName: apiTerm.genericName,
              strengthsList: apiTerm.strengthsList || [],
              rxcui: apiTerm.rxcui
            });
            existingGenerics.add(apiTerm.genericName.toLowerCase());
          }
        }
        setSuggestions(merged);
        setIsOpen(true);
      } catch (err) {
        console.error('Error fetching RxNav suggestions:', err);
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
    
    // Route mapping (enhanced clinical keyword parser)
    let route: MedRoute = 'PO';
    const lowerName = displayName.toLowerCase();
    if (lowerName.includes('sublingual') || lowerName.includes('sl')) {
      route = 'SL';
    } else if (lowerName.includes('inhalation') || lowerName.includes('inh') || lowerName.includes('spray') || lowerName.includes('aerosol') || lowerName.includes('puffer')) {
      route = 'INH';
    } else if (lowerName.includes('topical') || lowerName.includes('top') || lowerName.includes('cream') || lowerName.includes('ointment') || lowerName.includes('gel')) {
      route = 'TOP';
    } else if (lowerName.includes('ophthalmic') || lowerName.includes('oph') || lowerName.includes('eye') || lowerName.includes('drop')) {
      route = 'OPH';
    } else if (lowerName.includes('patch') || lowerName.includes('transdermal')) {
      route = 'PATCH';
    } else if (lowerName.includes('injection') || lowerName.includes('inj') || lowerName.includes('subcutaneous') || lowerName.includes('sc') || lowerName.includes('sub-q')) {
      route = 'SC';
    } else if (lowerName.includes('intravenous') || lowerName.includes('iv')) {
      route = 'IV';
    } else if (lowerName.includes('intramuscular') || lowerName.includes('im')) {
      route = 'IM';
    } else if (lowerName.includes('rectal') || lowerName.includes('pr') || lowerName.includes('suppository')) {
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
      } else if (lowerStr.includes('sol') || lowerStr.includes('liq') || lowerStr.includes('susp') || lowerStr.includes('ml') || lowerStr.includes('/')) {
        dosage = '5 mL';
      } else if (lowerStr.includes('inh') || lowerStr.includes('aer') || lowerStr.includes('puffer') || lowerStr.includes('spray')) {
        dosage = '1 Puffer';
      } else if (lowerStr.includes('patch')) {
        dosage = '1 Patch';
      } else if (lowerStr.includes('cream') || lowerStr.includes('oint') || lowerStr.includes('gel')) {
        dosage = '1 Application';
      }
    } else {
      // Default fallback values if list is empty
      strength = '10mg';
      dose = '10mg';
      dosage = '1 Tablet';
    }

    // Extract brand name from parentheses if present (e.g. "Lisinopril (Prinivil)")
    let brandName = '';
    const brandMatch = displayName.match(/\(([^)]+)\)/);
    if (brandMatch) {
      brandName = brandMatch[1];
    }

    const details: MedDetails = {
      generic_name: genericName,
      brand_name: brandName,
      rxcui: suggestion.rxcui,
      strength: strength,
      dose: dose,
      dosage: dosage,
      route: route,
      frequency: 'QD',
      frequency_times: ['09:00'],
      strengthsList: strengthsList.length > 0 ? strengthsList : [strength]
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
            if (!val || val.length < 2) {
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
          <div className="max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-teal-50/50 focus:bg-teal-50 border-b border-slate-50 last:border-0 transition-all group outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-white group-focus:bg-white flex items-center justify-center text-slate-400 group-hover:text-quro-teal group-focus:text-quro-teal transition-all">
                    <Pill size={14} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-quro-teal group-focus:text-quro-teal transition-colors capitalize">
                    {suggestion.displayName}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-100 group-hover:bg-white px-2 py-1 rounded-md uppercase">
                  {suggestion.rxcui ? 'NIH RxNav' : 'Local Lib'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
