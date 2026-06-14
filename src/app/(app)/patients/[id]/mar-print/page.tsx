// ============================================================
// Quro — Surveyor-Grade MAR & TAR Double-Sided Print Engine
// Configuration: Landscape Letter Layout with Combined MAR/TAR Matrix & Vitals Back copy
// ============================================================
"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectedOrder {
  id: string;
  title: string;
  details: string;
  frequency: string;
  frequency_times: string[];
  order_type: string;
  is_psychotropic?: boolean;
  psychotropic_monitoring?: string[];
  start_date: string;
}

// Derive a clean medication or treatment title, parsing order_text if structured fields are missing
function deriveTitle(data: any): string {
  if (data.generic_name && data.generic_name !== "Unspecified Order") {
    return data.generic_name;
  }
  if (data.title && data.title !== "Unspecified Order") {
    return data.title;
  }
  
  if (data.order_text) {
    const firstPart = data.order_text.split(/ - |\n|,\s*Dose:/i)[0].trim();
    const strengthRegex = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|tab|caps|tablet|capsule|unit|u|meq|%)/i;
    const match = firstPart.match(strengthRegex);
    if (match && match.index !== undefined && match.index > 0) {
      const derived = firstPart.substring(0, match.index).trim();
      if (derived) {
        return derived.replace(/[\s-–,]+$/, "");
      }
    }
    return firstPart;
  }
  
  return "Unspecified Order";
}

export default function MarTarPrintPage() {
  const params = useParams() as { id: string };
  const { organization, loading: authLoading } = useAuth();
  
  const [patient, setPatient] = useState<any>(null);
  const [medications, setMedications] = useState<ProjectedOrder[]>([]);
  const [treatments, setTreatments] = useState<ProjectedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonthName, setCurrentMonthName] = useState("");
  const [currentYear, setCurrentYear] = useState(2026);

  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' }).toUpperCase();
    setCurrentMonthName(month);
    setCurrentYear(now.getFullYear());
  }, []);

  useEffect(() => {
    async function loadPrintData() {
      if (authLoading) return;
      if (!organization || !params.id) {
        setLoading(false);
        return;
      }
      
      console.log("[MAR Print Engine] Loading print data for:", { orgId: organization.id, patientId: params.id });
      
      try {
        // 1. Fetch Patient Record dynamically
        const pDoc = await getDoc(doc(db, "organizations", organization.id, "patients", params.id));
        if (pDoc.exists()) {
          setPatient({ id: pDoc.id, ...pDoc.data() });
        }

        // 2. Query All Active Provider Orders (status !== 'draft')
        const ordersRef = collection(db, "organizations", organization.id, "patients", params.id, "provider_orders");
        const q = query(
          ordersRef,
          where("status", "in", ["signed", "acknowledged", "sent_to_pharmacy", "filled"])
        );
        
        const snapshot = await getDocs(q);
        const meds: ProjectedOrder[] = [];
        const txs: ProjectedOrder[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const orderType = data.order_type || "medication";
          
          let times = data.frequency_times || [];
          if (times.length === 0) {
            const freq = (data.frequency || "QD").toUpperCase();
            if (freq === "BID") times = ["09:00", "17:00"];
            else if (freq === "TID") times = ["09:00", "13:00", "17:00"];
            else if (freq === "QID") times = ["09:00", "13:00", "17:00", "21:00"];
            else if (freq === "QHS") times = ["21:00"];
            else if (freq === "PRN") times = [];
            else times = ["09:00"];
          }

          let startDateStr = "02/05/2026";
          if (data.created_at) {
            try {
              const d = typeof data.created_at.toDate === 'function' ? data.created_at.toDate() : new Date(data.created_at);
              if (!isNaN(d.getTime())) {
                startDateStr = `${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
              }
            } catch (e) {
              console.error(e);
            }
          }

          const order: ProjectedOrder = {
            id: doc.id,
            title: deriveTitle(data),
            details: data.instructions || data.special_instructions || data.order_text || `Route: ${data.route || "N/A"} | Freq: ${data.frequency || "QD"}`,
            frequency: data.frequency || "QD",
            frequency_times: times,
            order_type: orderType,
            is_psychotropic: data.is_psychotropic || false,
            psychotropic_monitoring: data.psychotropic_monitoring || [],
            start_date: startDateStr
          };

          if (orderType === "medication") {
            meds.push(order);
          } else {
            txs.push(order);
          }
        });
        
        setMedications(meds);
        setTreatments(txs);
      } catch (err) {
        console.error("Print pre-render query fault:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrintData();
  }, [organization, params.id, authLoading]);

  if (authLoading) return <div className="p-8 text-xs font-mono">Authenticating Session...</div>;
  if (!organization) return <div className="p-8 text-xs font-mono text-red-500">Error: Unauthorized or Organization Not Found.</div>;
  if (loading) return <div className="p-8 text-xs font-mono">Compiling Document Layout...</div>;

  // Combine medications and treatments for unified layout
  const allRecords = [...medications, ...treatments];

  // Pagination Configuration:
  // - First pages (Middle pages) can fit up to 6 records per page.
  // - The last page can fit up to 3 records to leave space for the legend, demographics footer, and blank templates.
  const RECORDS_PER_MIDDLE_PAGE = 6;
  const RECORDS_PER_LAST_PAGE = 3;

  const pages: ProjectedOrder[][] = [];
  
  if (allRecords.length <= RECORDS_PER_LAST_PAGE) {
    pages.push(allRecords);
  } else {
    // Slice off the last RECORDS_PER_LAST_PAGE records to guarantee they go to the last page.
    const lastRecords = allRecords.slice(allRecords.length - RECORDS_PER_LAST_PAGE);
    const middleRecords = allRecords.slice(0, allRecords.length - RECORDS_PER_LAST_PAGE);
    
    // Chunk middleRecords into chunks of RECORDS_PER_MIDDLE_PAGE
    for (let i = 0; i < middleRecords.length; i += RECORDS_PER_MIDDLE_PAGE) {
      pages.push(middleRecords.slice(i, i + RECORDS_PER_MIDDLE_PAGE));
    }
    
    // Append the last page
    pages.push(lastRecords);
  }

  // Ensure at least one page is rendered
  if (pages.length === 0) {
    pages.push([]);
  }

  // Format Patient Info Fallbacks for Footer
  const patientName = patient ? `${patient.last_name || ""}, ${patient.first_name || ""}`.trim() : "Loading...";
  const patientRoom = patient?.room_number || "TBD";
  const patientMrn = patient?.mrn || "TBD";
  const attendingPhysician = patient?.attending_physician || "Dr. Singhal";
  
  let patientDobFormatted = "TBD";
  if (patient?.date_of_birth) {
    try {
      const d = new Date(patient.date_of_birth);
      if (!isNaN(d.getTime())) {
        patientDobFormatted = `${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
      }
    } catch {}
  }

  let patientGender = "F";
  if (patient?.gender) {
    patientGender = patient.gender.charAt(0).toUpperCase();
  }

  let admitDate = "02/05/2026";
  if (patient?.admission_date) {
    try {
      const d = new Date(patient.admission_date);
      if (!isNaN(d.getTime())) {
        admitDate = `${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
      }
    } catch {}
  }

  let patientAllergiesFormatted = "NKDA";
  if (patient?.allergies && patient.allergies.length > 0) {
    patientAllergiesFormatted = patient.allergies.join(", ");
  }

  let patientDiagnoses = "FAILURE TO THRIVE, ANXIETY";
  if (patient?.diagnoses && patient.diagnoses.length > 0) {
    patientDiagnoses = patient.diagnoses.join(", ").toUpperCase();
  }

  const pharmacyName = patient?.pharmacy_info?.name?.toUpperCase() || "MEDICNE SHOPPE";

  return (
    <div className="p-4 bg-white text-black min-h-screen">
      
      {/* Print Control Header Bar (Hidden during print) */}
      <div className="no-print mb-6 flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl">
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-teal-400">MAR & TAR Binder Print Ready</h1>
          <p className="text-xs text-slate-400 font-light">Configured for landscape double-sided (front and back) printing.</p>
        </div>
        <button 
          type="button"
          onClick={() => window.print()}
          className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-teal-500/20"
        >
          Execute Double-Sided Print
        </button>
      </div>

      {/* Pages Loop */}
      {pages.map((pageRecords, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;
        
        return (
          <React.Fragment key={`page-pair-${pageIdx}`}>
            
            {/* ==================== FRONT SIDE: MAR/TAR SHEET (Page X) ==================== */}
            <div className="print-page page-front">
              {/* Header Title Grid */}
              <div className="flex justify-between items-center mb-2 bg-[#0284c7] text-white p-2 rounded text-[9px] font-black uppercase tracking-widest">
                <span>Medication & Treatment Administration Record (MAR/TAR)</span>
                <span>{currentMonthName} {currentYear} • Front Copy — Page {pageIdx + 1} of {pages.length}</span>
              </div>

              {/* Grid Table */}
              <table className="w-full border-collapse border border-black text-[9px] table-fixed">
                <thead>
                  <tr className="bg-sky-50 text-[8px] uppercase tracking-wider font-black h-8 text-slate-800">
                    <th className="border border-black p-1 text-left w-[30%]">Medication / Treatment Details</th>
                    <th className="border border-black p-1 text-center w-[8%]">Hour</th>
                    {daysArray.map((day) => (
                      <th key={day} className="border border-black w-[2%] text-center font-mono text-[7px]">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRecords.map((record) => {
                    const isPRN = record.frequency.toUpperCase() === "PRN";
                    const displayTimes = isPRN 
                      ? ["PRN"] 
                      : (record.frequency_times.length > 0 ? record.frequency_times : ["09:00"]);
                    const subRowsCount = 4;
                    
                    return (
                      <React.Fragment key={record.id}>
                        {Array.from({ length: subRowsCount }).map((_, rowIndex) => (
                          <tr key={`${record.id}-${rowIndex}`} className="h-5 break-inside-avoid">
                            {rowIndex === 0 && (
                              <td rowSpan={subRowsCount} className="border border-black p-1.5 align-top bg-white print-border overflow-hidden">
                                <div className="text-[7px] text-rose-600 font-bold mb-0.5">
                                  {record.start_date}
                                </div>
                                <div className="font-black uppercase text-[8px] text-black leading-tight truncate">
                                  {record.title}
                                  {record.is_psychotropic && (
                                    <span className="ml-1 px-1 bg-red-100 text-red-800 border border-red-200 rounded text-[6px] font-black uppercase tracking-tight">
                                      Psych
                                    </span>
                                  )}
                                </div>
                                <div className="text-[7px] text-slate-500 font-mono mt-0.5 leading-tight truncate-multi">
                                  {record.details}
                                </div>
                              </td>
                            )}
                            <td className="border border-black text-center font-mono text-[7px] bg-white print-border font-bold text-slate-800 h-5">
                              {displayTimes[rowIndex] || ""}
                            </td>
                            {daysArray.map((day) => (
                              <td key={day} className="border border-black bg-white print-border text-center align-middle font-mono text-[6px] text-slate-200 relative w-6 h-5 p-0 select-none">
                                {day}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Render Handwriting Templates on the Last Page */}
                  {isLastPage && Array.from({ length: 3 }).map((_, idx) => (
                    <React.Fragment key={`blank-template-${idx}`}>
                      {Array.from({ length: 4 }).map((_, rowIndex) => (
                        <tr key={`blank-template-${idx}-${rowIndex}`} className="h-5 break-inside-avoid">
                          {rowIndex === 0 && (
                            <td rowSpan={4} className="border border-black p-1.5 align-bottom bg-white print-border overflow-hidden">
                              <div className="border-b border-dashed border-slate-300 h-6 w-full" />
                              <div className="text-[6px] text-slate-400 font-mono italic mt-1 leading-tight uppercase font-semibold">
                                Additional Order / Medication (Scribe Manually)
                              </div>
                            </td>
                          )}
                          <td className="border border-black text-center font-mono text-[7px] bg-white print-border h-5" />
                          {daysArray.map((day) => (
                            <td key={day} className="border border-black bg-white print-border text-center align-middle font-mono text-[6px] text-slate-200 relative w-6 h-5 p-0 select-none">
                              {day}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Compact Initial & Signature Legend */}
              <div className="mt-2 break-inside-avoid">
                <div className="border border-black p-2 grid grid-cols-4 gap-x-4 gap-y-1 text-[7px] uppercase font-mono break-inside-avoid bg-white">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="flex justify-between border-b border-slate-200 pb-0.5 items-center">
                      <span>Initial: ______</span>
                      <span>Signature: _________________</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Styled Demographic Bottom Footer */}
              <div className="print-page-footer mt-2 border border-black text-[8px] uppercase font-mono tracking-tight divide-y divide-black bg-white">
                {/* Row 1 */}
                <div className="grid grid-cols-12 divide-x divide-black">
                  <div className="col-span-3 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Physician/Alt. Physician</span>
                    <span className="font-black text-slate-800">{attendingPhysician}</span>
                  </div>
                  <div className="col-span-2 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Phone No.</span>
                    <span className="font-bold">_________________</span>
                  </div>
                  <div className="col-span-5 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Primary Diagnosis</span>
                    <span className="font-black text-slate-800 truncate">{patientDiagnoses}</span>
                  </div>
                  <div className="col-span-2 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Pharmacy</span>
                    <span className="font-black text-slate-800 truncate">{pharmacyName}</span>
                  </div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-12 divide-x divide-black">
                  <div className="col-span-3 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Resident</span>
                    <span className="font-black text-slate-800">{patientName}</span>
                  </div>
                  <div className="col-span-1 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Rm/Bed</span>
                    <span className="font-bold truncate text-slate-850">{patientRoom}</span>
                  </div>
                  <div className="col-span-2 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Admit No./Date</span>
                    <span className="font-black text-slate-800">{admitDate}</span>
                  </div>
                  <div className="col-span-1 p-1 flex flex-col justify-between text-center">
                    <span className="text-[6px] text-slate-400">Sex</span>
                    <span className="font-black text-slate-800">{patientGender}</span>
                  </div>
                  <div className="col-span-1 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">DOB</span>
                    <span className="font-black text-slate-800">{patientDobFormatted}</span>
                  </div>
                  <div className="col-span-3 p-1 flex flex-col justify-between">
                    <span className="text-[6px] text-slate-400">Allergies/Notes</span>
                    <span className="font-black text-slate-800 truncate">{patientAllergiesFormatted}</span>
                  </div>
                  <div className="col-span-1 p-1 flex flex-col justify-between text-center">
                    <span className="text-[6px] text-slate-400">Month/Year</span>
                    <span className="font-black text-slate-800">{currentMonthName} {currentYear}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== BACK SIDE: VITALS & NOTES SHEET (Page X) ==================== */}
            <div className="print-page page-back">
              {/* Daily Vital Signs Table */}
              <div className="mb-2">
                <div className="bg-[#0284c7] text-white p-1 text-center text-[9px] font-black uppercase tracking-widest mb-1 rounded">
                  Daily Vital Signs Record • Back Copy
                </div>
                <table className="w-full border-collapse border border-black text-[8px] uppercase font-mono table-fixed">
                  <thead>
                    <tr className="bg-slate-100 text-[7px] h-6 text-slate-700">
                      <th className="border border-black p-1 text-left w-[15%] font-bold">Day of Month</th>
                      {daysArray.map((day) => (
                        <th key={day} className="border border-black w-[2.7%] text-center font-bold">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* BP Row with Diagonal Split cells */}
                    <tr className="h-10">
                      <td className="border border-black p-1 font-black bg-slate-50 text-[7.5px] leading-tight">
                        Blood Pressure
                        <span className="block text-[5px] text-slate-400 lowercase font-normal leading-none mt-0.5">
                          systolic / diastolic
                        </span>
                      </td>
                      {daysArray.map((day) => (
                        <td key={day} className="border border-black bg-white print-border relative w-6 h-10 p-0">
                          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <line x1="0" y1="100%" x2="100%" y2="0" stroke="black" strokeWidth="0.5" />
                          </svg>
                          <span className="absolute top-0.5 right-1 text-[5px] text-slate-400 leading-none">S</span>
                          <span className="absolute bottom-0.5 left-1 text-[5px] text-slate-400 leading-none">D</span>
                        </td>
                      ))}
                    </tr>
                    {/* Pulse Row */}
                    <tr className="h-5">
                      <td className="border border-black p-1 font-black bg-slate-50 text-[7.5px]">Pulse</td>
                      {daysArray.map((day) => (
                        <td key={day} className="border border-black bg-white print-border" />
                      ))}
                    </tr>
                    {/* Weight Row */}
                    <tr className="h-5">
                      <td className="border border-black p-1 font-black bg-slate-50 text-[7.5px]">Weight (lbs)</td>
                      {daysArray.map((day) => (
                        <td key={day} className="border border-black bg-white print-border" />
                      ))}
                    </tr>
                    {/* Temperature Row */}
                    <tr className="h-5">
                      <td className="border border-black p-1 font-black bg-slate-50 text-[7.5px]">Temperature</td>
                      {daysArray.map((day) => (
                        <td key={day} className="border border-black bg-white print-border" />
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Nurse's Medication Notes Table */}
              <div>
                <div className="bg-[#0284c7] text-white p-1 text-center text-[9px] font-black uppercase tracking-widest mb-1 rounded">
                  Nurse&apos;s Medication Notes
                </div>
                <table className="w-full border-collapse border border-black text-[8px] uppercase font-mono table-fixed">
                  <thead>
                    <tr className="bg-slate-100 text-[6.5px] font-bold text-center h-6 text-slate-700">
                      <th className="border border-black p-1 w-[8%]">Date</th>
                      <th className="border border-black p-1 w-[8%]">Time Given</th>
                      <th className="border border-black p-1 w-[32%]">Medication & Dosage</th>
                      <th className="border border-black p-1 w-[8%]">Route</th>
                      <th className="border border-black p-1 w-[13%]">Reason</th>
                      <th className="border border-black p-1 w-[13%]">Results & Response</th>
                      <th className="border border-black p-1 w-[8%]">Time Noted</th>
                      <th className="border border-black p-1 w-[10%]">Nurse Signature/Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 14 }).map((_, idx) => (
                      <tr key={`note-row-${idx}`} className="h-[26px] break-inside-avoid">
                        <td className="border border-black bg-white print-border" />
                        <td className="border border-black bg-white print-border" />
                        <td className="border border-black bg-white print-border" />
                        <td className="border border-black bg-white print-border" />
                        <td className="border border-black bg-white print-border" />
                        <td className="border border-black bg-white print-border" />
                        <td className="border border-black bg-white print-border" />
                        <td className="border border-black bg-white print-border" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Back Page Resident Identifier Footer (HIPAA Compliant safety anchor) */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-slate-300 pt-1 flex justify-between items-center text-[7px] uppercase font-mono tracking-widest text-slate-400 bg-white">
                <span>Resident: {patientName} • MRN: {patientMrn} • Room: {patientRoom}</span>
                <span>Back Page copy — Page {pageIdx + 1} of {pages.length}</span>
              </div>
            </div>

          </React.Fragment>
        );
      })}

      {/* Styled Layout & Page-Break Reset Sheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body, body > div, main.main-content {
            display: block !important;
            overflow: visible !important;
            position: relative !important;
            height: auto !important;
            min-height: auto !important;
            background-color: #ffffff !important;
          }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { 
            size: letter landscape !important; 
            margin: 0.3in 0.3in 0.3in 0.3in !important; 
          }
          .no-print { display: none !important; }
          
          .print-page {
            page-break-after: always;
            break-after: page;
            position: relative;
            box-sizing: border-box;
            height: 7.7in !important;
            max-height: 7.7in !important;
            overflow: hidden !important;
            background-color: #ffffff !important;
          }

          /* Force page break specifically after front/back copy pairs */
          .page-front {
            page-break-after: always !important;
            break-after: page !important;
          }
          .page-back {
            page-break-after: always !important;
            break-after: page !important;
          }

          /* General browser page break rules */
          .break-inside-avoid { 
            page-break-inside: avoid !important; 
            break-inside: avoid !important; 
          }
          tbody, tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-page-footer {
            position: absolute;
            bottom: 0 !important;
            left: 0;
            right: 0;
            background-color: #ffffff !important;
            z-index: 9999 !important;
          }
        }

        /* Multiline truncated detail rendering */
        .truncate-multi {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}} />

    </div>
  );
}
