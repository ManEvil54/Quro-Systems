// ============================================================
// Quro — MAR 31-Day Print Engine
// High-Contrast B&W for Commercial Printers
// ============================================================
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient, Medication, MarEntry } from '@/lib/firebase/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate } from 'date-fns';
import { Edit2, Save, Plus, Trash2, Printer } from 'lucide-react';

export default function MARPrintPage() {
  const { id: patientId } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const { organization } = useAuth();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [marEntries, setMarEntries] = useState<MarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customRows, setCustomRows] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [facilityTemplate, setFacilityTemplate] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const monthParam = searchParams.get('month') || format(new Date(), 'yyyy-MM');
  const [year, month] = monthParam.split('-').map(Number);
  const targetDate = new Date(year, month - 1, 1);
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(targetDate),
    end: endOfMonth(targetDate)
  });

  useEffect(() => {
    async function fetchData() {
      if (!organization || !patientId) return;

      try {
        // 1. Fetch Patient
        const pDoc = await getDoc(doc(db, 'organizations', organization.id, 'patients', patientId));
        let facilityId = '';
        
        if (pDoc.exists()) {
          const data = pDoc.data() as Patient;
          setPatient({ ...data, id: pDoc.id } as Patient);
          setCustomRows(data.mar_custom_rows || []);
          setSpecialNotes(data.mar_special_notes || '');
          facilityId = data.facility_id || '';
        }

        // 2. Fetch Facility Template
        if (facilityId) {
          const fDoc = await getDoc(doc(db, 'organizations', organization.id, 'facilities', facilityId));
          if (fDoc.exists()) {
            setFacilityTemplate(fDoc.data().mar_template || []);
          }
        }

        // 3. Fetch Medications
        const medsRef = collection(db, 'organizations', organization.id, 'patients', patientId, 'medications');
        const medsQuery = query(medsRef, where('status', '==', 'active'));
        const medsSnap = await getDocs(medsQuery);
        const allMeds = medsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
        setMedications(allMeds);

        // 3. Fetch MAR Entries for the month
        const start = startOfMonth(targetDate).toISOString();
        const end = endOfMonth(targetDate).toISOString();
        const marRef = collection(db, 'organizations', organization.id, 'patients', patientId, 'mar_entries');
        const marQuery = query(marRef, where('scheduled_date', '>=', start), where('scheduled_date', '<=', end));
        const marSnap = await getDocs(marQuery);
        setMarEntries(marSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarEntry)));

        setLoading(false);
        
        // Auto-trigger print after a short delay for rendering
        setTimeout(() => {
          window.print();
        }, 1000);
      } catch (err) {
        console.error('Error fetching MAR print data:', err);
      }
    }

    fetchData();
  }, [organization, patientId, monthParam]);

  const saveTemplate = async () => {
    if (!organization || !patientId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'patients', patientId), {
        mar_custom_rows: customRows,
        mar_special_notes: specialNotes,
        updated_at: new Date().toISOString()
      });
      setIsEditMode(false);
    } catch (err) {
      console.error('Error saving MAR template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomRow = () => {
    setCustomRows([...customRows, '']);
  };

  const updateCustomRow = (index: number, value: string) => {
    const newRows = [...customRows];
    newRows[index] = value;
    setCustomRows(newRows);
  };

  const removeCustomRow = (index: number) => {
    setCustomRows(customRows.filter((_, i) => i !== index));
  };

  if (loading || !patient) return <div className="p-10">Preparing MAR for print...</div>;

  const standardMeds = medications.filter(m => !m.is_psychotropic);
  const psychMeds = medications.filter(m => m.is_psychotropic);

  const renderMedTable = (medList: Medication[], title: string) => (
    <div className="mb-8 print:break-after-page">
      <h2 className="text-sm font-black uppercase mb-2 border-l-4 border-black pl-2">{title}</h2>
      <table className="w-full border-collapse border-2 border-black text-[9px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1 w-48 text-left">Medication / Dose / Route / Freq</th>
            <th className="border border-black p-1 w-12">Time</th>
            {daysInMonth.map(day => (
              <th key={day.toString()} className="border border-black p-0.5 w-6 text-center">
                {getDate(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medList.map((med) => (
            <React.Fragment key={med.id}>
              {med.frequency_times.map((time, timeIdx) => (
                <tr key={`${med.id}-${time}`} className="h-8">
                  {timeIdx === 0 && (
                    <td 
                      className="border border-black p-1.5 align-top font-bold" 
                      rowSpan={med.frequency_times.length + (med.requires_vitals ? 1 : 0)}
                    >
                      <div className="uppercase">{med.generic_name}</div>
                      <div className="text-[8px] font-normal">
                        {med.strength} {med.dosage} {med.route} {med.frequency}<br/>
                        {med.special_instructions && `* ${med.special_instructions}`}
                      </div>
                    </td>
                  )}
                  <td className="border border-black p-1 text-center font-bold">
                    {time}
                  </td>
                  {daysInMonth.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const entry = marEntries.find(e => 
                      e.medication_id === med.id && 
                      e.scheduled_time === time && 
                      e.scheduled_date.startsWith(dayStr)
                    );
                    
                    return (
                      <td key={day.toString()} className="border border-black text-center text-[10px] font-black">
                        {entry?.action === 'given' ? entry.administered_by?.slice(0, 2).toUpperCase() : ''}
                        {entry?.action === 'held' ? 'H' : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Extra row for Vitals (BP/Pulse) */}
              {med.requires_vitals && !med.is_psychotropic && (
                <tr className="h-6 bg-gray-50/50">
                  <td className="border border-black p-1 text-center font-black text-[7px] italic">
                    {med.vital_type || 'BP/P'}
                  </td>
                  {daysInMonth.map(day => (
                    <td key={day.toString()} className="border border-black"></td>
                  ))}
                </tr>
              )}
              {/* Extra row for Psych Monitoring Assessments */}
              {med.is_psychotropic && (
                <tr className="h-6 bg-gray-50/50">
                  <td className="border border-black p-1 text-center font-black text-[7px] italic uppercase">
                    SIDE EFFECTS (1-3)
                  </td>
                  {daysInMonth.map(day => (
                    <td key={day.toString()} className="border border-black"></td>
                  ))}
                </tr>
              )}
            </React.Fragment>
          ))}

          {/* Persisted Custom Rows (Editable) */}
          {customRows.map((row, idx) => (
            <tr key={`custom-${idx}`} className="h-10">
              <td className="border border-black p-2 font-bold uppercase">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <input 
                      className="w-full bg-yellow-50 p-1 border-none outline-none"
                      value={row}
                      onChange={(e) => updateCustomRow(idx, e.target.value)}
                      placeholder="Enter custom medication or instruction..."
                    />
                    <button onClick={() => removeCustomRow(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  row || 'Custom Entry'
                )}
              </td>
              <td className="border border-black"></td>
              {daysInMonth.map(day => (
                <td key={day.toString()} className="border border-black"></td>
              ))}
            </tr>
          ))}

          {/* Minimum 5 rows total if list is short */}
          {(medList.length + customRows.length) < 5 && Array.from({ length: 5 - (medList.length + customRows.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="h-10">
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              {daysInMonth.map(day => (
                <td key={day.toString()} className="border border-black"></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white text-black font-sans print:p-0">
      {/* DON Toolbar (Hidden on Print) */}
      <div className="no-print sticky top-0 bg-slate-900 text-white p-4 z-50 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black tracking-widest uppercase text-teal-400">MAR Print Manager</h2>
          <span className="h-4 w-px bg-white/20" />
          <p className="text-xs text-white/60">DON can add manual rows or instructions that persist month-to-month.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              isEditMode ? 'bg-amber-500 text-white' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Edit2 size={14} />
            {isEditMode ? 'EXIT EDIT MODE' : 'ENTER DON EDIT MODE'}
          </button>
          {isEditMode && (
            <>
              <button 
                onClick={addCustomRow} 
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                <Plus size={14} />
                ADD BLANK ROW
              </button>
              <button 
                onClick={saveTemplate} 
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                <Save size={14} />
                {isSaving ? 'SAVING...' : 'SAVE TEMPLATE'}
              </button>
            </>
          )}
          {!isEditMode && (
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-lg shadow-emerald-900/20"
            >
              <Printer size={16} />
              PRINT RECORD
            </button>
          )}
        </div>
      </div>

      <div className="p-8 max-w-[1100px] mx-auto print:max-w-none print:p-0">
        {/* Header Block */}
        <div className="border-2 border-black p-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Medication Administration Record</h1>
            <p className="text-xs font-bold">{format(targetDate, 'MMMM yyyy')} — {patient.last_name}, {patient.first_name}</p>
          </div>
          <div className="text-[9px] text-right">
            <p>MRN: {patient.mrn} | Room: {patient.room_number || 'N/A'}</p>
            <p>Allergies: {patient.allergies.join(', ') || 'NKA'}</p>
          </div>
        </div>

        {/* Main Section */}
        {renderMedTable(standardMeds, "Routine & BP Medications")}

        {/* Psychotropic Section (New Page) */}
        {psychMeds.length > 0 && (
          <>
            <div className="print:page-break-before-always" />
            <div className="border-2 border-black p-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter">Psychotropic Administration Record</h1>
                <p className="text-xs font-bold">{format(targetDate, 'MMMM yyyy')} — {patient.last_name}, {patient.first_name}</p>
              </div>
              <div className="text-[9px] text-right">
                <p>MRN: {patient.mrn} | Room: {patient.room_number || 'N/A'}</p>
              </div>
            </div>
            {renderMedTable(psychMeds, "Psychotropic Medications")}
            <div className="border-2 border-black p-3 mt-4 text-[9px]">
              <p className="font-bold border-b border-black mb-2 uppercase">Psychotropic Monitoring Legend:</p>
              <div className="grid grid-cols-3 gap-4 font-black">
                <p>1 = NO (Negative for Side Effects)</p>
                <p>2 = YES (Positive for Side Effects)</p>
                <p>3 = INTERMITTENT / SEE NOTES</p>
              </div>
              <div className="mt-3 text-[7px] text-gray-500 italic">
                Note: Side effects include EPS, TD, Sedation, or Involuntary Movements. Any entry of '2' or '3' requires a clinical note.
              </div>
            </div>
          </>
        )}

        {/* Behavioral & AIMS Section (New Page) */}
        <div className="print:page-break-before-always" />
        <div className="border-2 border-black p-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Behavioral & Side Effect Monitoring</h1>
            <p className="text-xs font-bold">{format(targetDate, 'MMMM yyyy')} — {patient.last_name}, {patient.first_name}</p>
          </div>
          <div className="text-[9px] text-right">
            <p>MRN: {patient.mrn} | Room: {patient.room_number || 'N/A'}</p>
          </div>
        </div>

        {/* Facility Specific Charting (Daily/Shift) */}
        <div className="mb-8">
          <h2 className="text-sm font-black uppercase mb-2 border-l-4 border-black pl-2">Daily Maintenance & Care (Facility Protocol)</h2>
          <table className="w-full border-collapse border-2 border-black text-[8px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 w-44 text-left">Monitoring / Care Action</th>
                <th className="border border-black p-1 w-12 text-center">Freq</th>
                {daysInMonth.map(day => (
                  <th key={day.toString()} className="border border-black p-0.5 w-6 text-center">
                    {getDate(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facilityTemplate.map((item) => (
                <React.Fragment key={item.id}>
                  {item.frequency === 'qShift' || item.frequency === 'TID' ? (
                    <>
                      <tr>
                        <td rowSpan={item.frequency === 'TID' ? 3 : 2} className="border border-black p-2 font-bold uppercase align-top">
                          {item.label}
                          <p className="text-[6px] font-normal lowercase italic text-gray-500">{item.category}</p>
                        </td>
                        <td className="border border-black p-1 text-center font-bold bg-gray-50">{item.frequency === 'TID' ? 'AM' : 'DAY'}</td>
                        {daysInMonth.map(day => (
                          <td key={day.toString()} className="border border-black h-5"></td>
                        ))}
                      </tr>
                      {item.frequency === 'TID' && (
                        <tr>
                          <td className="border border-black p-1 text-center font-bold bg-gray-50">NOON</td>
                          {daysInMonth.map(day => (
                            <td key={day.toString()} className="border border-black h-5"></td>
                          ))}
                        </tr>
                      )}
                      <tr>
                        <td className="border border-black p-1 text-center font-bold bg-gray-50">{item.frequency === 'TID' ? 'PM' : 'NIGHT'}</td>
                        {daysInMonth.map(day => (
                          <td key={day.toString()} className="border border-black h-5"></td>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="border border-black p-2 font-bold uppercase">
                        {item.label}
                        <p className="text-[6px] font-normal lowercase italic text-gray-500">{item.category}</p>
                      </td>
                      <td className="border border-black p-1 text-center font-bold bg-gray-50">{item.frequency}</td>
                      {daysInMonth.map(day => (
                        <td key={day.toString()} className="border border-black h-8"></td>
                      ))}
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {/* Fallback empty rows if no template */}
              {facilityTemplate.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="border border-black h-10 w-44"></td>
                  <td className="border border-black w-12 bg-gray-50"></td>
                  {daysInMonth.map(day => (
                    <td key={day.toString()} className="border border-black h-10"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Behavioral Frequency Log (Q12H) */}
        <div className="mb-8">
          <h2 className="text-sm font-black uppercase mb-2 border-l-4 border-black pl-2">Behavioral Frequency Log (Q12H - Every Shift)</h2>
          <table className="w-full border-collapse border-2 border-black text-[8px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 w-32 text-left">Behavior Type</th>
                <th className="border border-black p-1 w-12">Shift</th>
                {daysInMonth.map(day => (
                  <th key={day.toString()} className="border border-black p-0.5 w-6 text-center">
                    {getDate(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['Agitation / Aggression', 'Anxiety / Pacing', 'Wandering / Exit Seeking', 'Sleep Disturbance'].map(behavior => (
                <React.Fragment key={behavior}>
                  <tr>
                    <td rowSpan={2} className="border border-black p-2 font-bold uppercase">{behavior}</td>
                    <td className="border border-black p-1 text-center font-bold bg-gray-50">DAY</td>
                    {daysInMonth.map(day => (
                      <td key={day.toString()} className="border border-black h-5"></td>
                    ))}
                  </tr>
                  <tr>
                    <td className="border border-black p-1 text-center font-bold bg-gray-50">NIGHT</td>
                    {daysInMonth.map(day => (
                      <td key={day.toString()} className="border border-black h-5"></td>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[7px] italic text-gray-500">Record frequency of behavior per shift. 0 = None, 1 = Mild, 2 = Moderate, 3 = Severe.</p>
        </div>

        {/* AIMS Monitoring Grid */}
        <div className="mb-8">
          <h2 className="text-sm font-black uppercase mb-2 border-l-4 border-black pl-2">Abnormal Involuntary Movement Scale (AIMS)</h2>
          <table className="w-full border-collapse border-2 border-black text-[8px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 w-44 text-left">Body Area / Movement</th>
                {daysInMonth.map(day => (
                  <th key={day.toString()} className="border border-black p-0.5 w-6 text-center">
                    {getDate(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['Facial & Oral (Lips, Jaw, Tongue)', 'Extremities (Arms, Hands, Legs)', 'Trunk (Shoulders, Hips, Torso)'].map(area => (
                <tr key={area}>
                  <td className="border border-black p-2 font-bold uppercase">{area}</td>
                  {daysInMonth.map(day => (
                    <td key={day.toString()} className="border border-black h-8"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer / Legend (At bottom of every page via print style) */}
        <div className="mt-8">
          <div className="border-2 border-black p-2 w-full">
            <p className="mb-2 border-b-2 border-black pb-1 text-[10px] font-black uppercase">Signature / Initials Legend (Manual Entry)</p>
            <div className="grid grid-cols-4 gap-x-6 gap-y-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-end gap-2 border-b border-black pb-1">
                  <span className="text-[6px] text-gray-400">NAME:</span>
                  <div className="flex-1"></div>
                  <span className="text-[6px] text-gray-400">INIT:</span>
                  <div className="w-6"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-2 flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-30">
        <span>Quro Systems — Clinical Excellence</span>
        <span>Generated: {format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; }
          @page { size: landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
