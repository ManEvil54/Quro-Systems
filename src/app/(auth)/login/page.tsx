// ============================================================
// Quro — Login Page
// High-End Medical Spa Aesthetic
// ============================================================
'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuroLogo from '@/components/brand/QuroLogo';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Shield, Activity, Mail, CheckCircle2 } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';
  const { signIn, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDemoAccess = async () => {
    setSubmitting(true);
    try {
      setEmail('demo@qurosystems.com');
      setPassword('QuroDemo2026!');
      clearError();
      await signIn('demo@qurosystems.com', 'QuroDemo2026!');
      router.push('/dashboard');
    } catch (err) {
      console.error('Demo access error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fcfdfe]">
      {/* Left Panel — Branding (Medical Spa Aesthetic) */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center bg-slate-900">
        {/* Deep clinical ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900/30" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 px-20 max-w-2xl">
          <div className="flex flex-col items-center lg:items-start">
            <QuroLogo size={64} showText variant="full" />
            <p className="text-[11px] font-black tracking-[0.4em] text-teal-400 uppercase mt-4 animate-in fade-in slide-in-from-left-4 duration-1000">
              Quality Understanding • Real-time Outcomes
            </p>
          </div>
          
          <div className="mt-16 space-y-8">
            <h2 className="text-5xl font-medium text-white tracking-tight leading-[1.1]">
              <span className="font-serif italic text-teal-400/80 font-light block mb-2">Precision care,</span>
              synchronized.
            </h2>
            
            <p className="text-xl text-slate-400 font-light leading-relaxed">
              The closed-loop clinical platform designed to reduce cognitive load and eliminate handover errors.
            </p>

            <div className="flex flex-col gap-6 pt-8">
              {[
                { icon: Shield, text: 'HIPAA compliant infrastructure' },
                { icon: Activity, text: 'Real-time multi-facility synchronization' },
                { icon: CheckCircle2, text: 'Fax-ready MAR generation' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-slate-300">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400">
                    <item.icon size={20} />
                  </div>
                  <span className="text-sm font-medium tracking-wide">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Forms */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-20 py-12 relative">
        {/* Subtle top light source */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />
        
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-12">
            <QuroLogo size={52} showText variant="full" />
            <p className="text-[9px] font-black tracking-[0.3em] text-teal-600 uppercase mt-2">
              Quality Understanding • Real-time Outcomes
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portal Access</h1>
              <p className="text-slate-500 mt-2 font-light">Secure clinical gateway for Quro healthcare providers.</p>
            </div>

            {error && (
              <div className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700 flex items-center gap-3 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Institutional Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none"
                    placeholder="name@facility.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                  <button type="button" className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700">Reset</button>
                </div>
                <div className="relative group">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-sm focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-teal-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enter Workspace'}
              </button>
            </form>

            {/* Quick Demo Access (Simplified One-Click) */}
            <div className="mt-12 pt-10 border-t border-slate-100 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                Prospect Access
              </div>
              
              <button
                type="button"
                onClick={handleDemoAccess}
                disabled={submitting || loading}
                className={`w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
                  isDemoMode 
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/20 animate-pulse' 
                    : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-slate-200/50'
                }`}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                  <>
                    <Activity size={18} className="text-teal-500" />
                    Explore Platinum Health Hub
                  </>
                )}
              </button>
              
              <p className="mt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Instant Access · No Credit Card Required
              </p>
            </div>

            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-10">
              ModernQure LLC · HIPAA Audited 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500/10 border-t-teal-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
