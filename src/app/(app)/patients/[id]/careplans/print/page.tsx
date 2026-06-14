"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function CarePlanPrintSuite() {
  const params = useParams() as { id: string };
  const { organization, loading: authLoading } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCarePlans() {
      if (authLoading) return;
      if (!organization || !params.id) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Patient Record dynamically
        const pDoc = await getDoc(doc(db, "organizations", organization.id, "patients", params.id));
        if (pDoc.exists()) {
          setPatient({ id: pDoc.id, ...pDoc.data() });
        }

        // 2. Fetch Active Care Plans
        const cpRef = collection(db, "organizations", organization.id, "patients", params.id, "care_plans");
        const q = query(cpRef, where("status", "==", "active"));
        const snap = await getDocs(q);
        
        const items: any[] = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        setCarePlans(items);
      } catch (err) {
        console.error("Care plan print construction fault:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCarePlans();
  }, [organization, params.id, authLoading]);

  if (loading || authLoading) {
    return <div className="p-8 font-mono text-xs uppercase tracking-widest text-slate-400">Compiling Care Plan Assets...</div>;
  }

  if (!patient) {
    return <div className="p-8 font-mono text-xs uppercase tracking-widest text-rose-500">Patient records missing.</div>;
  }

  return (
    <div className="w-full text-black bg-white select-none antialiased">
      {/* Absolute Specificity Layout Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: letter portrait !important; margin: 0.5in !important; }
          body { background: #ffffff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .page-split-force { page-break-after: always !important; break-after: always !important; }
          .print-border { border: 2px solid #000000 !important; }
        }
      `}} />

      {/* Controller Top Strip */}
      <div className="no-print mb-6 p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
        <div>
          <h1 className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-widest">SIFF Care Plan Print Core</h1>
          <p className="text-[10px] text-slate-400 font-light">Enforced Single-Issue Pagination Active.</p>
        </div>
        <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
          Execute Print Run
        </button>
      </div>

      {/* CORE LOOP: Each entry gets forced onto exactly one page */}
      {carePlans.length === 0 ? (
        <div className="p-8 border border-dashed border-slate-300 text-center text-slate-400 italic rounded-2xl">
          No active care plans registered for this resident.
        </div>
      ) : (
        carePlans.map((plan, idx) => (
          <section 
            key={plan.id} 
            className={`h-[9.6in] max-h-[10in] flex flex-col justify-between p-2 mb-12 bg-white ${
              idx !== carePlans.length - 1 ? "page-split-force" : ""
            }`}
          >
            {/* Document Identity Ribbon */}
            <div>
              <div className="border-b-4 border-black pb-2 mb-3 flex justify-between items-end">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Interdisciplinary Care Plan</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SIFF Compliance Layout • Module: {plan.category}</p>
                </div>
                <div className="text-right font-mono text-[10px] uppercase font-bold text-slate-700">
                  Page {idx + 1} of {carePlans.length}
                </div>
              </div>

              {/* Patient Identification Block */}
              <div className="border border-black p-2 mb-4 grid grid-cols-4 gap-4 text-[10px] uppercase font-mono tracking-tight bg-slate-50/50 rounded">
                <div>
                  <span className="font-bold text-slate-400">Resident:</span>{' '}
                  <span className="font-black text-slate-900">{patient?.last_name}, {patient?.first_name}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400">MRN:</span>{' '}
                  <span className="font-black text-slate-900">{patient?.mrn}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400">DOB:</span>{' '}
                  <span className="font-black text-slate-900">{patient?.date_of_birth}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400">Room:</span>{' '}
                  <span className="font-black text-slate-900">{patient?.room_number || 'TBD'}</span>
                </div>
              </div>

              {/* Core Care Plan Grid */}
              <div className="space-y-4">
                {/* FOCUS AREA */}
                <div className="border-2 border-black p-3 rounded-xl bg-slate-50/50">
                  <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-wider mb-1 border-b border-black pb-0.5">I. Clinical Focus / Problem Statement</h3>
                  <p className="text-xs text-slate-800 leading-relaxed font-serif">{plan.focus}</p>
                </div>

                {/* MEASURABLE GOALS */}
                <div className="border-2 border-black p-3 rounded-xl bg-white">
                  <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-wider mb-2 border-b border-black pb-0.5">II. Measurable Goals & Target Outcomes</h3>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-300 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="pb-1">Target Milestone Metric Description</th>
                        <th className="pb-1 text-right w-32">Target Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.goals?.map((goal: any, gIdx: number) => (
                        <tr key={gIdx} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 text-slate-800 font-medium font-serif">🎯 {goal.text}</td>
                          <td className="py-2 text-right font-mono text-slate-600 text-[11px] font-bold">{goal.target_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* DISCIPLINED INTERVENTIONS */}
                <div className="border-2 border-black p-3 rounded-xl bg-white">
                  <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-wider mb-2 border-b border-black pb-0.5">III. Specific Care Orders & Interventions</h3>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="pb-1 text-left w-28">Discipline</th>
                        <th className="pb-1 text-left">Action Strategy & Target Interventions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.interventions?.map((item: any, iIdx: number) => (
                        <tr key={iIdx} className="border-b border-slate-200 last:border-0 h-10">
                          <td className="py-1 align-top pt-2">
                            <span className="bg-slate-900 text-white border border-black font-black uppercase text-[8px] tracking-widest px-2 py-0.5 rounded-md print:bg-black print:text-white">
                              {item.discipline}
                            </span>
                          </td>
                          <td className="py-1 text-slate-800 leading-normal pt-2 font-medium">{item.text}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Verification Signature Anchor at the base of every isolated page */}
            <div className="border-t border-slate-300 pt-3 flex justify-between items-end text-slate-500 text-[8px] uppercase tracking-widest font-mono">
              <div>
                Quro Systems Care Engine v4.5 • Confidential Medical Record
              </div>
              <div className="flex gap-4 text-right">
                <div>Date: __________________</div>
                <div>IDT Care Coordinator Signature: ___________________________</div>
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
