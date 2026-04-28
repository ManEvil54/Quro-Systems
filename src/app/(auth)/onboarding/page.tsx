// ============================================================
// Quro — Onboarding Wizard
// Organization + Facility Setup (post-registration)
// ============================================================
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import QuroLogo from '@/components/brand/QuroLogo';
import {
  Building2,
  Home,
  MapPin,
  Phone,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react';

interface FacilityForm {
  name: string;
  type: 'clhf' | 'snf' | 'alf';
  phone: string;
  fax: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Org form
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgLicense, setOrgLicense] = useState('');
  const [orgAddress, setOrgAddress] = useState({ street: '', city: '', state: '', zip: '' });

  // Facilities (up to 3 houses)
  const [facilities, setFacilities] = useState<FacilityForm[]>([
    { name: '', type: 'clhf', phone: '', fax: '' },
  ]);

  const addFacility = () => {
    if (facilities.length >= 3) return;
    setFacilities([...facilities, { name: '', type: 'clhf', phone: '', fax: '' }]);
  };

  const removeFacility = (i: number) => {
    if (facilities.length <= 1) return;
    setFacilities(facilities.filter((_, idx) => idx !== i));
  };

  const updateFacility = (i: number, key: keyof FacilityForm, value: string) => {
    setFacilities(facilities.map((f, idx) => idx === i ? { ...f, [key]: value } : f));
  };

  const handleComplete = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const orgRef = doc(collection(db, 'organizations'));
      const orgId = orgRef.id;

      // Create organization
      await setDoc(orgRef, {
        name: orgName,
        slug,
        contact_email: orgEmail,
        contact_phone: orgPhone,
        address: orgAddress,
        license_number: orgLicense || null,
        max_facilities: 3,
        subscription_tier: 'standard',
        is_active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Create facilities
      for (const f of facilities) {
        if (!f.name) continue;
        const facilityRef = doc(collection(db, 'organizations', orgId, 'facilities'));
        await setDoc(facilityRef, {
          org_id: orgId,
          name: f.name,
          facility_type: f.type,
          address: orgAddress, // Inherit org address by default
          phone: f.phone || null,
          fax: f.fax || null,
          license_number: null,
          max_patients: 6,
          administrator_name: null,
          is_active: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }

      // Link staff to org
      await updateDoc(doc(db, 'staff', user.uid), {
        org_id: orgId,
        updated_at: serverTimestamp(),
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(13,148,136,0.04) 0%, transparent 50%)',
      }}
    >
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <QuroLogo size={44} showText variant="full" />
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[{ n: 1, label: 'Organization' }, { n: 2, label: 'Facilities' }].map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step >= s.n ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > s.n ? <CheckCircle2 size={18} /> : s.n}
              </div>
              <span className={`text-sm font-medium ${step >= s.n ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
              {s.n < 2 && <div className={`w-16 h-0.5 ${step > 1 ? 'bg-teal-400' : 'bg-slate-200'} transition-colors`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          {/* Step 1: Organization Info */}
          {step === 1 && (
            <div className="animate-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                  <Building2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Organization Details</h2>
                  <p className="text-sm text-slate-500">Your parent company or operating entity</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ob-org-name" className="block text-sm font-medium text-slate-700 mb-1">Organization Name *</label>
                  <input id="ob-org-name" className="input" placeholder="ModernQure LLC" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ob-org-email" className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                    <input id="ob-org-email" type="email" className="input" placeholder="admin@company.com" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="ob-org-phone" className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input id="ob-org-phone" type="tel" className="input" placeholder="(555) 123-4567" value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label htmlFor="ob-org-license" className="block text-sm font-medium text-slate-700 mb-1">
                    License Number <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input id="ob-org-license" className="input" placeholder="State license #" value={orgLicense} onChange={(e) => setOrgLicense(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input className="input mb-2" placeholder="Street address" value={orgAddress.street} onChange={(e) => setOrgAddress({ ...orgAddress, street: e.target.value })} />
                  <div className="grid grid-cols-3 gap-2">
                    <input className="input" placeholder="City" value={orgAddress.city} onChange={(e) => setOrgAddress({ ...orgAddress, city: e.target.value })} />
                    <input className="input" placeholder="State" maxLength={2} value={orgAddress.state} onChange={(e) => setOrgAddress({ ...orgAddress, state: e.target.value.toUpperCase() })} />
                    <input className="input" placeholder="ZIP" value={orgAddress.zip} onChange={(e) => setOrgAddress({ ...orgAddress, zip: e.target.value })} />
                  </div>
                </div>
              </div>

              <button type="button" disabled={!orgName} onClick={() => setStep(2)}
                className="btn-primary shimmer-btn w-full flex items-center justify-center gap-2 py-3 mt-6 text-sm disabled:opacity-40">
                Continue to Facilities <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Facility Setup */}
          {step === 2 && (
            <div className="animate-in">
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                  <Home size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">CLHF Houses</h2>
                  <p className="text-sm text-slate-500">Add up to 3 facility houses in your cluster</p>
                </div>
              </div>

              <div className="space-y-4">
                {facilities.map((f, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white/50 relative">
                    {facilities.length > 1 && (
                      <button type="button" onClick={() => removeFacility(i)}
                        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={16} />
                      </button>
                    )}
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">House {i + 1}</p>
                    <div className="space-y-3">
                      <input className="input" placeholder="Facility name (e.g. Cedar Grove — House A)" value={f.name}
                        onChange={(e) => updateFacility(i, 'name', e.target.value)} />
                      <div className="grid grid-cols-3 gap-2">
                        {(['clhf', 'snf', 'alf'] as const).map((t) => (
                          <button key={t} type="button" onClick={() => updateFacility(i, 'type', t)}
                            className={`py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all ${
                              f.type === t ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input text-sm" placeholder="Phone" value={f.phone} onChange={(e) => updateFacility(i, 'phone', e.target.value)} />
                        <input className="input text-sm" placeholder="Fax (for pharmacy)" value={f.fax} onChange={(e) => updateFacility(i, 'fax', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}

                {facilities.length < 3 && (
                  <button type="button" onClick={addFacility}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16} /> Add Another House
                  </button>
                )}
              </div>

              <button type="button" disabled={!facilities[0]?.name || submitting} onClick={handleComplete}
                className="btn-primary shimmer-btn w-full flex items-center justify-center gap-2 py-3 mt-6 text-sm disabled:opacity-40">
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Launch Quro <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
