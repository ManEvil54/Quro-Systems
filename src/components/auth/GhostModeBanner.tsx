"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, LogOut, Terminal } from "lucide-react";

export default function GhostModeBanner() {
  const { isImpersonating, stopImpersonating, impersonatedDonName, staff } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] animate-in fade-in slide-in-from-top duration-500">
      {/* Outer Pulse Container */}
      <div className="bg-rose-600 text-white shadow-[0_0_50px_rgba(225,29,72,0.3)] border-b border-rose-400/30">
        <div className="max-w-[2000px] mx-auto flex justify-between items-center px-6 py-2.5">
          <div className="flex items-center gap-6">
            {/* Pulsing Alert Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20 scale-150"></div>
              <div className="relative bg-white/20 p-2 rounded-xl border border-white/30">
                <ShieldAlert size={18} className="text-white" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-rose-200">System Priority Access</span>
                <span className="w-1 h-1 rounded-full bg-rose-300"></span>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-rose-100 flex items-center gap-1">
                   <Terminal size={10} /> Audited Session
                </span>
              </div>
              <p className="text-sm font-black tracking-tight uppercase italic leading-none mt-1">
                <span className="text-white/80 not-italic font-medium mr-2">Warning:</span> 
                System Tech/Owner is entering your facility page 
                <span className="mx-3 text-rose-300/40">|</span>
                <span className="text-rose-100 underline decoration-rose-400 underline-offset-4">Acting as {impersonatedDonName || "Admin"}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:block px-4 py-2 bg-black/20 rounded-xl border border-white/10">
               <p className="text-[9px] font-black text-rose-200 uppercase tracking-widest mb-0.5">Session ID</p>
               <p className="text-[10px] font-mono font-bold opacity-70">QURO-GHOST-{Math.random().toString(36).substring(7).toUpperCase()}</p>
            </div>

            <button 
              onClick={stopImpersonating}
              className="group flex items-center gap-2 bg-white text-rose-600 px-5 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all hover:bg-rose-50 hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/20"
            >
              <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
              Exit Infrastructure
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom Warning Glow */}
      <div className="h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50 blur-sm"></div>
    </div>
  );
}
