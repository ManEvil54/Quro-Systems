// ============================================================
// Quro — Registry Onboarding & Password Reset
// Required for first-time login or registry staff
// ============================================================
'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Briefcase, 
  Key, 
  ArrowRight,
  ClipboardCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function OnboardingModal() {
  const { staff, user, organization } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: staff?.first_name || '',
    lastName: staff?.last_name || '',
    credential: staff?.credential || '',
    newPassword: '',
    confirmPassword: ''
  });

  if (!staff || staff.is_onboarded) return null;

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !organization || !staff) return;

    if (formData.newPassword !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Password in Firebase Auth
      if (formData.newPassword) {
        await updatePassword(user, formData.newPassword);
      }

      // 2. Update Profile in Firestore
      await updateDoc(doc(db, 'organizations', organization.id, 'staff', staff.id), {
        first_name: formData.firstName,
        last_name: formData.lastName,
        credential: formData.credential,
        initials: (formData.firstName[0] + formData.lastName[0]).toUpperCase(),
        is_onboarded: true,
        must_change_password: false,
        updated_at: new Date().toISOString()
      });

      // Reload page to refresh state
      window.location.reload();
    } catch (err) {
      console.error('Error during onboarding:', err);
      alert('Error completing profile. Please contact IT.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-quro-charcoal p-10 text-white relative">
          <div className="absolute top-0 right-0 p-8">
            <ShieldCheck size={48} className="text-quro-teal opacity-20" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Initialize Credentials</h2>
          <p className="text-white/60 font-medium max-w-sm">
            Welcome to Quro. For HIPAA compliance, registry and new staff must verify their identity and set a private clinical password.
          </p>
          
          <div className="mt-8 flex gap-2">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-quro-teal w-8' : 'bg-white/10 w-4'}`} />
            ))}
          </div>
        </div>

        <form onSubmit={handleComplete} className="p-10 space-y-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify First Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm focus:border-quro-teal outline-none transition-all"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Last Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm focus:border-quro-teal outline-none transition-all"
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professional Credential (Title)</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    placeholder="e.g. Registered Nurse, LVN, CNA"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-quro-teal outline-none transition-all font-bold"
                    value={formData.credential}
                    onChange={e => setFormData({...formData, credential: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-quro-charcoal text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                Next: Security Setup
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Set Private Clinical Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type={showPassword ? 'text' : 'password'}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-12 pr-12 py-4 text-sm focus:border-quro-teal outline-none transition-all font-bold"
                    value={formData.newPassword}
                    onChange={e => setFormData({...formData, newPassword: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-quro-teal"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                <input 
                  required
                  type="password"
                  className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm focus:border-quro-teal outline-none transition-all font-bold"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex gap-3">
                <ClipboardCheck className="text-emerald-600 flex-shrink-0" size={20} />
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                  By completing this setup, you certify that you are the authorized user of these credentials and will maintain HIPAA confidentiality.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-quro-teal text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-teal-700 transition-all shadow-xl shadow-teal-900/20 disabled:opacity-50"
                >
                  {isSaving ? 'SECURING PROFILE...' : 'COMPLETE ONBOARDING'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
