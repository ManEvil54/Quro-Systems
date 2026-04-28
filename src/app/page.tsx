// ============================================================
// Quro — Marketing Landing Page
// High-End Spa-Tech Aesthetic
// ============================================================
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Activity, ClipboardList, Clock, ShieldCheck } from 'lucide-react';
import QuroLogo from '@/components/brand/QuroLogo';

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QuroLogo size={32} showText={true} />
          </div>
          <div className="flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors">Features</Link>
            <Link href="#clinical" className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors">Clinical Edge</Link>
            <Link 
              href="/login" 
              className="px-5 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-all border border-teal-100"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-6 relative overflow-hidden">
        {/* Background Teal Glow Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-[11px] font-bold tracking-[0.2em] mb-6 uppercase">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              Integrated Multi-Facility Solutions
            </div>
            
            <h1 className="text-5xl lg:text-7xl tracking-tight leading-[1.1] mb-6">
              <span className="font-serif italic text-teal-700 font-light">Synchronized</span><br />
              <span className="font-medium text-slate-900">Clinical Excellence</span>
            </h1>
            
            <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
              Elevate your operations with <span className="font-semibold text-slate-800">Quro</span>: 
              the unified synchronization hub for up to <span className="text-teal-600 font-medium">3 facilities (1–25 beds each)</span>. 
              Experience a seamless digital handshake between shifts, high-precision MAR generation, and 
              intelligent provider order loops.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                Request Enterprise Demo
              </button>
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-all backdrop-blur-md">
                Client Login
              </Link>
            </div>
          </div>
          
          {/* Static Hero Visual */}
          <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-100 to-blue-50 rounded-[3rem] blur-3xl opacity-50 transform -translate-y-10"></div>
            <div className="relative rounded-[2rem] shadow-2xl shadow-slate-900/10 overflow-hidden aspect-[16/10] flex flex-col group border border-slate-200/50">
              <Image 
                src="/premium-hero.png"
                alt="Quro Clinical Excellence"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Precision without the clinical coldness.</h2>
            <p className="text-slate-600">We designed Quro to feel like a high-end spa, reducing cognitive load so your nurses can focus entirely on patient care.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/50">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 text-teal-600">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Shift Handshake</h3>
              <p className="text-slate-600 leading-relaxed">
                Eliminates verbal report errors and ensures 100% handover accountability.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/50">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 text-teal-600">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">MAR Generation</h3>
              <p className="text-slate-600 leading-relaxed">
                Produces high-contrast, "Fax-Ready" documents that pass state audits.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/50">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 text-teal-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Provider Orders</h3>
              <p className="text-slate-600 leading-relaxed">
                Synchronizes new orders directly from the physician to the pharmacy-ready fax bundle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-6 h-6 rounded bg-teal-500 flex items-center justify-center text-white font-bold text-xs">Q</div>
            <span className="font-semibold text-slate-200">Quro Systems</span>
          </div>
          <div className="text-sm">
            &copy; 2026 ModernQure LLC. All rights reserved. HIPAA Compliant.
          </div>
        </div>
      </footer>
    </div>
  );
}


