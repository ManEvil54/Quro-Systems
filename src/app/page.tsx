// ============================================================
// Quro — Marketing Landing Page
// High-End Spa-Tech Aesthetic
// ============================================================
import Link from 'next/link';
import { Activity, ClipboardList, Clock, ShieldCheck, TrendingUp, Mic } from 'lucide-react';
import QuroLogo from '@/components/brand/QuroLogo';

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans selection:bg-teal-100/50 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <QuroLogo size={40} showText={true} />
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            <Link href="#features" className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-teal-600 transition-all">Features</Link>
            <Link href="#clinical" className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-teal-600 transition-all">Clinical Edge</Link>
            <Link 
              href="/login" 
              className="px-8 py-3 text-xs font-black tracking-widest uppercase text-white bg-slate-900 hover:bg-teal-600 rounded-full transition-all shadow-xl shadow-slate-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Evolved Hero: Combining Disruptive Typography with Premium Visuals */}
      <section className="relative min-h-[90vh] flex items-center bg-slate-50 overflow-hidden px-6 lg:px-12 pt-24 pb-32">
        {/* Background Ambience */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
          <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] bg-teal-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Left Column: Disruptive Branding */}
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            {/* The Acronym Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              <p className="text-[10px] font-bold tracking-[0.25em] text-slate-500 uppercase">
                Q.U.R.O. • Quality Understanding • Real-time Outcomes
              </p>
            </div>

            {/* The Disruptive Headline */}
            <h1 className="text-5xl md:text-7xl xl:text-8xl font-extralight tracking-tight text-slate-900 mb-8 leading-[1.1]">
              Evolved clinical ops. <br />
              <span className="font-medium text-teal-600">Zero mental clutter.</span>
            </h1>

            {/* The Hip Body Copy */}
            <p className="text-lg text-slate-500 font-light leading-relaxed mb-12">
              We believe medical software should feel as intuitive as the apps you use every day. 
              <span className="text-slate-800 font-normal"> Quro Systems</span> delivers uncompromising clinical precision 
              within a premium, low-stress environment.
            </p>

            {/* Strategic CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link 
                href="/login?demo=true"
                className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white rounded-2xl text-sm font-semibold hover:bg-slate-800 hover:scale-[1.02] transition-all shadow-2xl shadow-slate-200 active:scale-95 text-center"
              >
                Get Started
              </Link>
              <Link 
                href="/login"
                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-600 border border-slate-200 rounded-2xl text-sm font-semibold hover:bg-slate-50 transition-all backdrop-blur-md text-center"
              >
                Request Demo
              </Link>
            </div>
            
            {/* Trust Signal */}
            <div className="mt-12 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Engineered for Multi-Facility Synchrony
            </div>
          </div>

          {/* Right Column: Premium Visual (Restored from previous version) */}
          <div className="flex-1 relative w-full max-w-2xl lg:max-w-none animate-in fade-in zoom-in-95 duration-1000">
            <div className="absolute -inset-4 bg-gradient-to-tr from-teal-200/20 to-blue-200/20 rounded-[4rem] blur-3xl opacity-60"></div>
            <div className="relative rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(15,23,42,0.15)] overflow-hidden aspect-[16/11] border border-white p-3 bg-white/40 backdrop-blur-sm">
              <div className="relative h-full w-full rounded-[2.5rem] overflow-hidden shadow-inner border border-slate-200/50">
                <Image 
                  src="/premium-hero.png"
                  alt="Quro Systems AI-Powered Clinical Dashboard for Sub-Acute Care"
                  fill
                  className="object-cover scale-105 hover:scale-100 transition-transform duration-[3s]"
                  priority
                />
                {/* Floating Glass Indicator */}
                <div className="absolute top-8 right-8 glass-card py-3 px-5 rounded-2xl border-white/40 flex items-center gap-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  <span className="text-[10px] font-black tracking-widest text-teal-800 uppercase">Live Intelligence Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Clinical Brain - AI Section */}
      <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-teal-500 rounded-full blur-[200px] -translate-y-1/2 translate-x-1/2"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="flex-1">
              <div className="text-teal-400 font-black tracking-[0.3em] uppercase text-[10px] mb-6">AI Noise Reduction</div>
              <h2 className="text-5xl lg:text-6xl font-medium mb-10 tracking-tight leading-[1.1]">
                The <span className="font-serif italic text-teal-400">Handover</span> <br />Synthesizer.
              </h2>
              <p className="text-xl text-slate-400 mb-12 leading-relaxed font-light max-w-xl">
                Legacy apps force nurses to scan 25 charts manually at 7:00 AM. 
                Quro&apos;s &quot;Clinical Brain&quot; analyzes the last 12 hours of vitals and notes to generate an 
                <span className="text-white font-medium"> Executive Summary</span> instantly.
              </p>
              
              <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
                <div className="flex items-center gap-3 mb-6 text-teal-400">
                  <Activity className="w-5 h-5" />
                  <span className="text-xs font-bold tracking-widest uppercase">Morning Briefing • 07:00</span>
                </div>
                <ul className="space-y-4">
                  {[
                    "Room 202 had a 3:00 AM spike in BP",
                    "Room 105 has a new order for Lisinopril",
                    "2 handshakes are still pending for the night shift"
                  ].map((item, i) => (
                    <li key={i} className="flex gap-4 text-sm text-slate-200">
                      <span className="text-teal-500 font-bold">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex-1 grid gap-8 w-full">
              {[
                {
                  title: "Smart 'Spine-Line' Trending",
                  desc: "Velocity-based alerts trigger a Soft Teal Pulse before vitals hit critical levels.",
                  val: "Early intervention, fewer hospital transfers.",
                  icon: TrendingUp
                },
                {
                  title: "Voice-to-Structured-SOAP",
                  desc: "Dictate notes directly. AI parses natural speech into professional clinical documentation.",
                  val: "Finished in seconds. Zero mental clutter.",
                  icon: Mic
                },
                {
                  title: "Fax-Ready Quality Auditor",
                  desc: "Scans for missing signatures or 'Holes' before surveyors walk in.",
                  val: "100% Compliance Score guaranteed.",
                  icon: ShieldCheck
                }
              ].map((ai, i) => (
                <div key={i} className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <div className="flex gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                      <ai.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2">{ai.title}</h3>
                      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{ai.desc}</p>
                      <div className="text-[10px] font-black tracking-widest text-teal-400 uppercase">{ai.val}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <div className="text-teal-600 font-black tracking-[0.3em] uppercase text-[10px] mb-4">Quro Clinical Excellence</div>
            <h2 className="text-4xl lg:text-5xl font-medium text-slate-900 mb-8 tracking-tight italic">Precision without the clinical coldness.</h2>
            <p className="text-lg text-slate-500 leading-relaxed font-light">We designed Quro to feel like a high-end spa, reducing cognitive load so your nurses can focus entirely on patient care.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { 
                title: 'Shift Handshake', 
                desc: 'Eliminates verbal report errors and ensures 100% handover accountability.',
                icon: Clock
              },
              { 
                title: 'MAR Generation', 
                desc: 'Produces high-contrast, "Fax-Ready" documents that pass state audits.',
                icon: ClipboardList
              },
              { 
                title: 'Provider Orders', 
                desc: 'Synchronizes new orders directly from the physician to the pharmacy-ready fax bundle.',
                icon: ShieldCheck
              }
            ].map((feature, idx) => (
              <div key={idx} className="group p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-[0_32px_64px_-16px_rgba(15,23,42,0.08)] hover:-translate-y-2">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-8 text-teal-600 border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all duration-500">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-light">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <QuroLogo size={32} showText={true} />
          </div>
          <div className="flex items-center gap-8 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            <span>HIPAA Compliant</span>
            <span>256-bit encryption</span>
            <span>SOC 2 Type II</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            &copy; 2026 ModernQure LLC · Quro Systems
          </div>
        </div>
      </footer>
    </div>
  );
}



