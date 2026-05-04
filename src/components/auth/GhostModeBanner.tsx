"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function GhostModeBanner() {
  const { isImpersonating, stopImpersonating, impersonatedDonName } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-600 text-white py-2 px-4 shadow-lg flex justify-between items-center animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-1 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <p className="text-sm font-bold tracking-wide uppercase">
          Ghost Mode Active: <span className="underline decoration-white/40 decoration-2 underline-offset-4 ml-1">Viewing as {impersonatedDonName || "Facility Admin"}</span>
        </p>
      </div>
      
      <button 
        onClick={stopImpersonating}
        className="bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1 rounded-md text-[11px] font-bold tracking-widest uppercase transition-all active:scale-95"
      >
        Exit Impersonation
      </button>
    </div>
  );
}
