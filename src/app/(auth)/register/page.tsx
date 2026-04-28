// ============================================================
// Quro — Register Page
// Multi-Step Registration with Role Selection
// ============================================================
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QuroLogo from '@/components/brand/QuroLogo';
import { useAuth } from '@/contexts/AuthContext';
import type { StaffRole } from '@/lib/firebase/types';
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Stethoscope,
  HeartPulse,
  UserCog,
  Pill,
  Shield,
  CheckCircle2,
} from 'lucide-react';

const roles: { value: StaffRole; label: string; icon: React.ElementType; desc: string; credential: string }[] = [
  { value: 'physician', label: 'Physician', icon: Stethoscope, desc: 'Order medications, sign charts', credential: 'MD / DO' },
  { value: 'nurse', label: 'Nurse', icon: HeartPulse, desc: 'Administer meds, chart vitals', credential: 'RN / LVN' },
  { value: 'cna', label: 'CNA', icon: UserCog, desc: 'Vitals, ADLs, patient care', credential: 'CNA' },
  { value: 'pharmacist', label: 'Pharmacist', icon: Pill, desc: 'Fill orders, verify meds', credential: 'PharmD' },
  { value: 'admin', label: 'Administrator', icon: Shield, desc: 'Manage facility & staff', credential: '' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, error, clearError } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    initials: '',
    email: '',
    password: '',
    role: '' as StaffRole | '',
    credential: '',
  });

  const updateForm = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Auto-generate initials
    if (key === 'firstName' || key === 'lastName') {
      const fn = key === 'firstName' ? value : form.firstName;
      const ln = key === 'lastName' ? value : form.lastName;
      setForm((f) => ({ ...f, [key]: value, initials: `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) return;
    clearError();
    setSubmitting(true);
    try {
      await signUp({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        initials: form.initials,
        role: form.role as StaffRole,
        credential: form.credential,
      });
      router.push('/onboarding');
    } catch {
      // Error handled by context
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = form.firstName && form.lastName && form.email && form.password.length >= 6;

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0c1322 0%, #0f172a 40%, #115e59 100%)' }}
      >
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div className="relative z-10 px-16 max-w-lg">
          <QuroLogo size={56} showText variant="full" />
          <h2 className="text-3xl font-bold text-white mt-10 leading-tight">
            Join the future of<br />
            <span className="text-teal-300">sub-acute care.</span>
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed">
            Create your account and connect your CLHF facility to the Quro platform
            in under 2 minutes.
          </p>

          {/* Step indicator */}
          <div className="mt-12 flex items-center gap-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step >= s
                    ? 'bg-teal-500 text-white shadow-lg'
                    : 'bg-white/10 text-slate-500'
                }`}>
                  {step > s ? <CheckCircle2 size={16} /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-teal-300' : 'text-slate-600'}`}>
                  {s === 1 ? 'Account' : 'Role'}
                </span>
                {s < 2 && <div className={`w-12 h-0.5 ${step > 1 ? 'bg-teal-500' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12"
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          backgroundImage: 'radial-gradient(ellipse at 70% 0%, rgba(13,148,136,0.03) 0%, transparent 50%)',
        }}
      >
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-10">
            <QuroLogo size={48} showText variant="full" />
          </div>

          <div className="glass-card p-8">
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-50/80 border border-red-100 text-sm text-red-700 flex items-center gap-2 animate-in">
                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Account Details */}
              {step === 1 && (
                <div className="animate-in">
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
                    <p className="text-sm text-slate-500 mt-1">Step 1 of 2 — Personal information</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="reg-first" className="block text-sm font-medium text-slate-700 mb-1">First name</label>
                        <input id="reg-first" className="input" value={form.firstName}
                          onChange={(e) => updateForm('firstName', e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="reg-last" className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
                        <input id="reg-last" className="input" value={form.lastName}
                          onChange={(e) => updateForm('lastName', e.target.value)} required />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-initials" className="block text-sm font-medium text-slate-700 mb-1">
                        Initials <span className="text-slate-400 font-normal">(for MAR signatures)</span>
                      </label>
                      <input id="reg-initials" className="input w-24" maxLength={3} value={form.initials}
                        onChange={(e) => setForm((f) => ({ ...f, initials: e.target.value.toUpperCase() }))} required />
                    </div>

                    <div>
                      <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input id="reg-email" type="email" className="input" placeholder="you@qurosystems.com"
                        value={form.email} onChange={(e) => updateForm('email', e.target.value)} required autoComplete="email" />
                    </div>

                    <div>
                      <label htmlFor="reg-pass" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                      <div className="relative">
                        <input id="reg-pass" type={showPassword ? 'text' : 'password'} className="input pr-10"
                          placeholder="Min. 6 characters" value={form.password}
                          onChange={(e) => updateForm('password', e.target.value)} required minLength={6} autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button type="button" disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    className="btn-primary shimmer-btn w-full flex items-center justify-center gap-2 py-3 mt-6 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* Step 2: Role Selection */}
              {step === 2 && (
                <div className="animate-in">
                  <div className="mb-6">
                    <button type="button" onClick={() => setStep(1)}
                      className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
                      <ArrowLeft size={14} /> Back
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">Select your role</h1>
                    <p className="text-sm text-slate-500 mt-1">Step 2 of 2 — Clinical role at your facility</p>
                  </div>

                  <div className="space-y-2.5">
                    {roles.map((r) => (
                      <button key={r.value} type="button"
                        onClick={() => setForm((f) => ({ ...f, role: r.value, credential: r.credential }))}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left ${
                          form.role === r.value
                            ? 'border-teal-300 bg-teal-50/50 shadow-sm'
                            : 'border-slate-100 bg-white/50 hover:border-slate-200 hover:bg-white/70'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          form.role === r.value
                            ? 'bg-teal-500 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          <r.icon size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                          <p className="text-xs text-slate-500">{r.desc}</p>
                        </div>
                        {form.role === r.value && <CheckCircle2 size={20} className="text-teal-500" />}
                      </button>
                    ))}
                  </div>

                  <button type="submit" disabled={!form.role || submitting}
                    className="btn-primary shimmer-btn w-full flex items-center justify-center gap-2 py-3 mt-6 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Create Account <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} Quro Systems by ModernQure LLC · HIPAA Compliant
          </p>
        </div>
      </div>
    </div>
  );
}
