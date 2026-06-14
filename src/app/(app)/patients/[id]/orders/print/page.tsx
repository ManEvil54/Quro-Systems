// ============================================================
// Quro — Surveyor-Grade Physician Order Sheet (POS) Print Engine
// Configuration: Landscape Letter / Portrait Layout with repeating footer
// ============================================================
"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs, getDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { safeFormat } from "@/lib/dateUtils";

interface PrintOrder {
  id: string;
  order_type: string;
  order_text: string;
  ordering_physician_name?: string;
  status: string;
  created_at: string;
  signed_at?: string;
  order_method?: string;
}

export default function PhysicianOrderPrintPage() {
  const params = useParams() as { id: string };
  const { organization, loading: authLoading } = useAuth();
  
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Patient Details State for dynamic surveyor header
  const [patientName, setPatientName] = useState("");
  const [patientRoom, setPatientRoom] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientMrn, setPatientMrn] = useState("");
  const [patientAllergies, setPatientAllergies] = useState<string[]>([]);
  const [attendingPhysician, setAttendingPhysician] = useState("");

  useEffect(() => {
    async function loadPrintData() {
      if (authLoading) return;
      if (!organization || !params.id) {
        setLoading(false);
        return;
      }
      
      console.log("[POS Print Engine] Loading print data for:", { orgId: organization.id, patientId: params.id });
      
      try {
        // 1. Fetch Patient Record dynamically for header card
        const pDoc = await getDoc(doc(db, "organizations", organization.id, "patients", params.id));
        if (pDoc.exists()) {
          const pData = pDoc.data();
          setPatientName(`${pData.first_name || ""} ${pData.last_name || ""}`.trim());
          setPatientRoom(pData.room_number || "TBD");
          setPatientMrn(pData.mrn || "TBD");
          setPatientAllergies(pData.allergies || []);
          setAttendingPhysician(pData.attending_physician || "TBD");
          if (pData.date_of_birth) {
            try {
              setPatientDob(new Date(pData.date_of_birth).toLocaleDateString());
            } catch {
              setPatientDob(pData.date_of_birth);
            }
          }
        }

        // 2. Query All Active / Signed / Acknowledged Orders (status !== 'draft')
        const ordersRef = collection(db, "organizations", organization.id, "patients", params.id, "provider_orders");
        const q = query(
          ordersRef,
          where("status", "!=", "draft")
        );
        
        const snapshot = await getDocs(q);
        const compiledOrders: PrintOrder[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          compiledOrders.push({
            id: doc.id,
            order_type: data.order_type || "other",
            order_text: data.order_text || "",
            ordering_physician_name: data.ordering_physician_name || "Attending Physician",
            status: data.status || "",
            created_at: data.created_at || new Date().toISOString(),
            signed_at: data.signed_at || "",
            order_method: data.order_method || "direct"
          });
        });

        // Sort chronologically (oldest to newest for clinical charting)
        compiledOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        setOrders(compiledOrders);
      } catch (err) {
        console.error("POS Print pre-render query fault:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPrintData();
  }, [organization, params.id, authLoading]);

  if (authLoading) return <div className="p-8 text-xs font-mono">Authenticating Session...</div>;
  if (!organization) return <div className="p-8 text-xs font-mono text-red-500">Error: Unauthorized or Organization Not Found.</div>;
  if (loading) return <div className="p-8 text-xs font-mono">Compiling Document Layout...</div>;

  return (
    <div className="p-4 bg-white text-black min-h-screen">
      
      {/* Print Control Header Bar */}
      <div className="no-print mb-6 flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl">
        <div>
          <h1 className="text-sm font-bold tracking-wider uppercase text-teal-400">Physician Order Sheet Print Ready</h1>
          <p className="text-xs text-slate-400 font-light">Optimized for landscape/portrait medical chart files.</p>
        </div>
        <button 
          type="button"
          onClick={() => window.print()}
          className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-teal-500/20"
        >
          Execute Hardware Print
        </button>
      </div>

      {/* Facility Record Metadata Header Block */}
      <div className="border border-black mb-6 grid grid-cols-12 text-[10px] uppercase font-mono tracking-tight divide-x divide-black">
        {/* Title Block */}
        <div className="col-span-3 p-3 flex flex-col justify-center">
          <div className="text-xs font-black tracking-tighter leading-none">PHYSICIAN ORDERS</div>
          <div className="text-[7px] leading-tight text-slate-500 font-bold mt-1">Skilled Nursing Facility Chart Copy</div>
        </div>

        {/* Patient Name */}
        <div className="col-span-3 p-3 flex flex-col justify-between">
          <div className="text-[7px] font-black text-slate-400">Patient Name</div>
          <div className="text-xs font-black">{patientName || "Loading..."}</div>
        </div>

        {/* Room / DOB */}
        <div className="col-span-2 p-3 flex flex-col justify-between">
          <div className="text-[7px] font-black text-slate-400">Room / DOB</div>
          <div className="text-[10px] font-black truncate">{patientRoom || "TBD"} • {patientDob || "TBD"}</div>
        </div>

        {/* MRN */}
        <div className="col-span-2 p-3 flex flex-col justify-between">
          <div className="text-[7px] font-black text-slate-400">Medical Record No. (MRN)</div>
          <div className="text-[10px] font-black truncate">{patientMrn}</div>
        </div>

        {/* Attending Physician */}
        <div className="col-span-2 p-3 flex flex-col justify-between">
          <div className="text-[7px] font-black text-slate-400">Attending Physician</div>
          <div className="text-[10px] font-black truncate">{attendingPhysician}</div>
        </div>
      </div>

      {/* Orders Table */}
      <table className="w-full border-collapse border border-black text-[10px] mb-8">
        <thead>
          <tr className="bg-slate-100 uppercase tracking-wider text-[8px] font-black">
            <th className="border border-black p-2 text-left w-32">Date & Time</th>
            <th className="border border-black p-2 text-left w-24">Type</th>
            <th className="border border-black p-2 text-left">Clinical Order Description & Instructions</th>
            <th className="border border-black p-2 text-left w-44">Ordering Prescriber</th>
            <th className="border border-black p-2 text-center w-24">Method</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="h-12 break-inside-avoid">
              <td className="border border-black p-2 font-mono text-[9px]">
                {safeFormat(order.created_at, 'MM/dd/yyyy HH:mm')}
              </td>
              <td className="border border-black p-2 font-black uppercase text-[8px] text-slate-500">
                {order.order_type}
              </td>
              <td className="border border-black p-2 font-medium text-[9px]">
                {order.order_text}
              </td>
              <td className="border border-black p-2 font-mono text-[9px]">
                {order.ordering_physician_name}
                {order.order_method === 'telephone' && !order.signed_at && (
                  <span className="block text-[7px] font-bold text-rose-600 uppercase mt-0.5 animate-pulse">
                    * Pending Co-Signature
                  </span>
                )}
                {order.signed_at && (
                  <span className="block text-[7px] font-bold text-teal-600 uppercase mt-0.5">
                    Co-Signed: {safeFormat(order.signed_at, 'MM/dd HH:mm')}
                  </span>
                )}
              </td>
              <td className="border border-black p-2 text-center font-bold text-[8px] uppercase">
                {order.order_method === 'telephone' ? 'Telephone (T.O.)' : 'Direct (CPOE)'}
              </td>
            </tr>
          ))}

          {orders.length === 0 && (
            <tr>
              <td colSpan={5} className="border border-black p-8 text-center text-slate-400 italic text-[10px]">
                No verified orders in chart history.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Repeating Footer with Dual Manual Signature Blocks */}
      <div className="print-footer-container mt-4 break-inside-avoid">
        <div className="border border-black p-4 grid grid-cols-2 gap-8 text-[9px] uppercase font-mono break-inside-avoid">
          <div className="flex flex-col justify-end space-y-4">
            <div className="h-[1px] bg-black w-full" />
            <div className="flex justify-between">
              <span>Physician / Prescriber Signature</span>
              <span>Date / Time: __________________</span>
            </div>
          </div>
          <div className="flex flex-col justify-end space-y-4">
            <div className="h-[1px] bg-black w-full" />
            <div className="flex justify-between">
              <span>Nurse / Transcribing Signature</span>
              <span>Date / Time: __________________</span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-between items-center text-[8px] font-black uppercase tracking-widest opacity-30">
          <span>Quro Systems — Clinical Excellence</span>
          <span>Generated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body, body > div, main.main-content {
            display: block !important;
            overflow: visible !important;
            position: relative !important;
            height: auto !important;
            min-height: auto !important;
          }
          body { -webkit-print-color-adjust: exact !important; }
          @page { size: letter portrait !important; margin: 0.4in 0.4in 1.4in 0.4in !important; }
          .no-print { display: none !important; }
          .break-inside-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
          .print-footer-container {
            position: fixed;
            bottom: 0.4in !important;
            left: 0;
            right: 0;
            background-color: #ffffff !important;
            z-index: 9999 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

    </div>
  );
}
