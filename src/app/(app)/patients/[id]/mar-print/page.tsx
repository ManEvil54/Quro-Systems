// ============================================================
// Quro — Surveyor-Grade MAR & TAR Print Engine
// Configuration: Landscape Letter Layout with Combined MAR/TAR Matrix
// ============================================================
"use client";

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
    // 1. Take the first part before any dash or newline
    const firstPart = data.order_text.split(/ - |\n|,\s*Dose:/i)[0].trim();
    
    // 2. Try to find where the strength starts to extract the drug name
    // e.g. "Donepezil (Aricept) 10mg" -> split at "10mg"
    const strengthRegex = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|tab|caps|tablet|capsule|unit|u|meq|%)/i;
    const match = firstPart.match(strengthRegex);
    if (match && match.index !== undefined && match.index > 0) {
      const derived = firstPart.substring(0, match.index).trim();
      if (derived) {
        // Clean up any trailing dashes, hyphens, or commas
        return derived.replace(/[\s-–,]+$/, "");
      }
    }
    return firstPart;
  }
  
  return "Unspecified Order";
}

export default function MarTarPrintPage() {
  const params = useParams() as { id: string };
  const { organization } = useAuth();
  
  const [medications, setMedications] = useState<ProjectedOrder[]>([]);
  const [treatments, setTreatments] = useState<ProjectedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Patient Details State for dynamic surveyor header
  const [patientName, setPatientName] = useState("");
  const [patientRoom, setPatientRoom] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientAllergies, setPatientAllergies] = useState<string[]>([]);
  const [currentMonthName, setCurrentMonthName] = useState("");

  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);
  const blankRowsCount = 3;

  useEffect(() => {
    const month = new Date().toLocaleString('default', { month: 'short' }).toUpperCase();
    setCurrentMonthName(month);
  }, []);

  useEffect(() => {
    async function loadPrintData() {
      if (!organization || !params.id) return;
      
      try {
        // 1. Fetch Patient Record dynamically for header card
        const pDoc = await getDoc(doc(db, "organizations", organization.id, "patients", params.id));
        if (pDoc.exists()) {
          const pData = pDoc.data();
          setPatientName(`${pData.first_name || ""} ${pData.last_name || ""}`.trim());
          setPatientRoom(pData.room_number || "TBD");
          setPatientAllergies(pData.allergies || []);
          if (pData.date_of_birth) {
            try {
              setPatientDob(new Date(pData.date_of_birth).toLocaleDateString());
            } catch {
              setPatientDob(pData.date_of_birth);
            }
          }
        }

        // 2. Query All Active Provider Orders (Option A SSOT)
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
          
          // Parse times fallback
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

          const order: ProjectedOrder = {
            id: doc.id,
            title: deriveTitle(data),
            details: data.instructions || data.special_instructions || data.order_text || `Route: ${data.route || "N/A"} | Freq: ${data.frequency || "QD"}`,
            frequency: data.frequency || "QD",
            frequency_times: times,
            order_type: orderType
          };

          if (orderType === "medication") {
            meds.push(order);
          } else {
            // Group diet, treatment, therapy, and acuity checks under TAR
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
  }, [organization, params.id]);

  if (loading) return <div className="p-8 text-xs font-mono">Compiling Document Layout...</div>;

  return (
    <div className="p-4 bg-white text-black min-h-screen">
      
      {/* Print Control Header Bar (Hidden during actual hardware print execution) */}
      <div className="no-print mb-6 flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl">
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-teal-400">MAR & TAR Binder Print Ready</h1>
          <p className="text-xs text-slate-400 font-light">Configured for landscape letter ledger layouts.</p>
        </div>
        <button 
          type="button"
          onClick={() => window.print()}
          className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-teal-500/20"
        >
          Execute Hardware Print
        </button>
      </div>

      {/* Facility Record Metadata Header Block (Surveyor Grade Grid) */}
      <div className="border border-black mb-4 grid grid-cols-12 text-[10px] uppercase font-mono tracking-tight divide-x divide-black">
        {/* Left MAR Title Block */}
        <div className="col-span-2 p-2 flex flex-col justify-center">
          <div className="text-xs font-black tracking-tighter leading-none">MAR / TAR</div>
          <div className="text-[7px] leading-tight text-slate-500 font-bold mt-1">Physician Order Sheet & Records</div>
        </div>

        {/* Month Selector Grid */}
        <div className="col-span-3 p-1.5 grid grid-rows-2 gap-1 text-[8px] print-border">
          <div className="flex justify-between gap-1 font-bold">
            {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'].map(m => (
              <span key={m} className={`px-1 rounded border border-black/10 ${currentMonthName === m ? 'bg-black text-white font-black' : ''}`}>{m}</span>
            ))}
          </div>
          <div className="flex justify-between gap-1 font-bold">
            {['JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => (
              <span key={m} className={`px-1 rounded border border-black/10 ${currentMonthName === m ? 'bg-black text-white font-black' : ''}`}>{m}</span>
            ))}
          </div>
        </div>

        {/* Patient Name */}
        <div className="col-span-3 p-2 flex flex-col justify-between print-border">
          <div className="text-[7px] font-black text-slate-400">Patient Name</div>
          <div className="text-xs font-black">{patientName || "Loading..."}</div>
        </div>

        {/* Room / DOB */}
        <div className="col-span-2 p-2 flex flex-col justify-between print-border">
          <div className="text-[7px] font-black text-slate-400">Room / DOB</div>
          <div className="text-[10px] font-black truncate">{patientRoom || "TBD"} • {patientDob || "TBD"}</div>
        </div>

        {/* Allergies / NKDA */}
        <div className="col-span-2 p-2 flex flex-col justify-between print-border">
          <div className="text-[7px] font-black text-slate-400">Allergies</div>
          <div className="text-[9px] font-bold truncate">
            {patientAllergies.length > 0 ? (
              patientAllergies.join(', ')
            ) : (
              <span className="flex items-center gap-1">
                <span className="border border-black w-2.5 h-2.5 flex items-center justify-center text-[7px] font-black">✓</span> NKDA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ================= SECTION 1: MAR GRID ================= */}
      <h2 className="text-[11px] font-bold tracking-wider uppercase mb-2 text-slate-700">1. Medication Administration Record (MAR)</h2>
      <table className="w-full border-collapse border border-black text-[10px] mb-8">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black p-2 text-left w-1/4 font-bold">Medication Details</th>
            <th className="border border-black p-2 text-center w-12 font-bold">Hour</th>
            {daysArray.map((day) => (
              <th key={day} className="border border-black w-6 text-center font-mono text-[9px]">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medications.map((med) => (
            <React.Fragment key={med.id}>
              {med.frequency_times.map((time, timeIdx) => (
                <tr key={`${med.id}-${timeIdx}`} className="h-10">
                  {timeIdx === 0 && (
                    <td rowSpan={med.frequency_times.length} className="border border-black p-2 align-top bg-white print-border">
                      <div className="font-bold uppercase text-[10px] text-black">{med.title}</div>
                      <div className="text-[9px] mt-1 text-slate-600 font-mono">{med.details}</div>
                    </td>
                  )}
                  <td className="border border-black text-center font-mono font-medium p-1 bg-white print-border">{time}</td>
                  {daysArray.map((day) => (
                    <td key={day} className="border border-black bg-white print-border" />
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
          
          {medications.length === 0 && (
            <tr>
              <td colSpan={33} className="border border-black p-4 text-center text-slate-400 italic text-[10px]">No active scheduled medication records.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ================= SECTION 2: TAR GRID (Treatments, Weights, Meals) ================= */}
      <h2 className="text-[11px] font-bold tracking-wider uppercase mb-2 text-slate-700">2. Treatment Administration Record (TAR)</h2>
      <table className="w-full border-collapse border border-black text-[10px] mb-8">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-black p-2 text-left w-1/4 font-bold">Treatment / Task Details</th>
            <th className="border border-black p-2 text-center w-12 font-bold">Shift</th>
            {daysArray.map((day) => (
              <th key={day} className="border border-black w-6 text-center font-mono text-[9px]">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {treatments.map((tx) => (
            <React.Fragment key={tx.id}>
              {tx.frequency_times.map((time, timeIdx) => (
                <tr key={`${tx.id}-${timeIdx}`} className="h-12">
                  {timeIdx === 0 && (
                    <td rowSpan={tx.frequency_times.length} className="border border-black p-2 align-top bg-white print-border">
                      <div className="font-bold uppercase text-teal-950 text-[10px]">{tx.title}</div>
                      <div className="text-[9px] mt-1 text-slate-600 font-mono">{tx.details}</div>
                    </td>
                  )}
                  <td className="border border-black text-center font-mono text-[9px] bg-white print-border">{time}</td>
                  {daysArray.map((day) => (
                    <td key={day} className="border border-black bg-white print-border text-center align-middle font-mono text-[8px] text-slate-400">
                      {tx.title.toLowerCase().includes("meal") ? "%" : ""}
                      {tx.title.toLowerCase().includes("weight") ? "lbs" : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}

          {/* Section B: Automated Blank Space Injection for Manual Overrides */}
          {Array.from({ length: blankRowsCount }).map((_, rowIndex) => (
            <tr key={`blank-${rowIndex}`} className="h-14">
              <td className="border border-black p-2 align-bottom font-mono text-[8px] text-slate-400">
                Additional Dr. Orders / Treatments Scribed Here Manually
                <div className="h-[1px] bg-slate-200 mt-2 w-full" />
              </td>
              <td className="border border-black text-center bg-white print-border" />
              {daysArray.map((day) => (
                <td key={day} className="border border-black bg-white print-border" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Initials Legend Box */}
      <div className="mt-4 border border-black p-3 grid grid-cols-4 gap-4 text-[9px] uppercase font-mono">
        <div className="border-r border-slate-300 pr-2 pb-2 border-b border-slate-100">Nurse Initial: ______ Signature: __________________</div>
        <div className="border-r border-slate-300 pr-2 pb-2 border-b border-slate-100">Nurse Initial: ______ Signature: __________________</div>
        <div className="border-r border-slate-300 pr-2 pb-2 border-b border-slate-100">Nurse Initial: ______ Signature: __________________</div>
        <div className="pb-2 border-b border-slate-100">Nurse Initial: ______ Signature: __________________</div>
        <div className="border-r border-slate-300 pr-2 pt-1">Nurse Initial: ______ Signature: __________________</div>
        <div className="border-r border-slate-300 pr-2 pt-1">Nurse Initial: ______ Signature: __________________</div>
        <div className="border-r border-slate-300 pr-2 pt-1">Nurse Initial: ______ Signature: __________________</div>
        <div className="pt-1">Therapist Initial: ______ Signature: __________________</div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; }
          @page { size: letter landscape !important; margin: 0.4in !important; }
          .no-print { display: none !important; }
        }
      `}</style>

    </div>
  );
}
