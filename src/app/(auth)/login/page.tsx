// ============================================================
// Quro — Login Page
// High-End Medical Spa Aesthetic
// ============================================================
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QuroLogo from '@/components/brand/QuroLogo';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch {
      // Error is handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0c1322 0%, #0f172a 40%, #115e59 100%)',
        }}
      >
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #5eead4 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        <div className="relative z-10 px-16 max-w-lg">
          <QuroLogo size={56} showText variant="full" />
          <h2 className="text-3xl font-bold text-white mt-10 leading-tight">
            Precision care,<br />
            <span className="text-teal-300">synchronized.</span>
          </h2>
          <p className="text-slate-400 mt-4 text-sm leading-relaxed">
            The closed-loop sub-acute care platform for Congregate Living Health Facilities.
            Medication administration, clinical handovers, and compliance — all in one system.
          </p>

          <div className="mt-12 flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <Shield size={18} className="text-teal-400" />
            <span className="text-xs text-slate-400">HIPAA-compliant · 256-bit encryption · SOC 2 Type II</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12"
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          backgroundImage: 'radial-gradient(ellipse at 70% 0%, rgba(13,148,136,0.03) 0%, transparent 50%)',
        }}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <QuroLogo size={48} showText variant="full" />
          </div>

          <div className="glass-card p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500 mt-1">Sign in to your care portal</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-50/80 border border-red-100 text-sm text-red-700 flex items-center gap-2 animate-in">
                <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="info@qurosystems.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button type="button" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || loading}
                className="btn-primary shimmer-btn w-full flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                New to Quro?{' '}
                <Link href="/register" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                  Create an account
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
