'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QuroLogo from '@/components/brand/QuroLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Activity,
  ShieldAlert,
  Shield,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Ghost,
  Stethoscope
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Facility } from '@/lib/firebase/types';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, staff, organization, activeFacility, signOut, switchFacility, isImpersonating } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [currentFacilityName, setCurrentFacilityName] = useState('Select Facility');
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!organization?.id || !staff) return;

    let isMounted = true;

    async function fetchFacilities() {
      try {
        const q = query(
          collection(db, 'organizations', organization!.id, 'facilities'),
          where('is_active', '==', true)
        );
        const snap = await getDocs(q);
        const allFacilities = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Facility));
        
        const isSystemAdmin = staff?.role === 'APP_OWNER' || staff?.role === 'APP_TECH' || staff?.role === 'SUPER_ADMIN' || isImpersonating;
        const isOrgAdmin = staff?.role === 'CLIENT_ADMIN' || staff?.role === 'FACILITY_ADMIN' || staff?.role === 'admin' || staff?.role === 'nurse' || staff?.role === 'physician';

        const accessible = isSystemAdmin || isOrgAdmin
          ? allFacilities
          : allFacilities.filter(f => staff?.assigned_facility_ids?.includes(f.id) || staff?.facility_id === f.id);
        
        if (isMounted) {
          setFacilities(accessible);
          const current = accessible.find(f => f.id === (activeFacility?.id || staff?.facility_id));
          if (current) setCurrentFacilityName(current.name);
          else setCurrentFacilityName('Select Facility');
        }
      } catch (err) {
        console.error('Error fetching facilities for sidebar:', err);
      }
    }

    fetchFacilities();

    return () => {
      isMounted = false;
    };
  }, [organization, staff, activeFacility, isImpersonating]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/patients', label: 'Patients', icon: Activity },
    { href: '/orders', label: 'Provider Orders', icon: Stethoscope },
    { href: '/falls', label: 'Safety & Incidents', icon: ShieldAlert },
    { href: '/handover', label: 'Handover', icon: ClipboardList },
  ];

  return (
    <aside className="sidebar flex flex-col h-screen">
      {/* Logo area with interactive Q.U.R.O. Breakdown */}
      <div className="px-6 py-8 border-b border-white/5 relative group cursor-help">
        <QuroLogo size={36} showText variant="full" />
        
        {/* Acronym Tagline */}
        <p className="text-[7px] font-black tracking-[0.4em] text-slate-500 uppercase mt-3 transition-colors group-hover:text-teal-400">
          Quality • Understanding • Real-time • Outcomes
        </p>

        {/* High-End Tooltip / Info Panel */}
        <div className="absolute left-[calc(100%-1rem)] top-4 ml-4 w-72 p-6 bg-slate-900 border border-white/10 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] z-[100] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-2 transition-all duration-300 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Clinical Value Framework</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-teal-400 font-black text-sm">[Q]</span>
              <div>
                <p className="text-[10px] font-bold text-slate-100 uppercase tracking-tight">Quality</p>
                <p className="text-[9px] text-slate-500 leading-relaxed">Automated audit trails and institutional signature legends.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-black text-sm">[U]</span>
              <div>
                <p className="text-[10px] font-bold text-slate-100 uppercase tracking-tight">Understanding</p>
                <p className="text-[9px] text-slate-500 leading-relaxed">AI-driven shift synthesis and velocity-based trend analysis.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-black text-sm">[R]</span>
              <div>
                <p className="text-[10px] font-bold text-slate-100 uppercase tracking-tight">Real-time</p>
                <p className="text-[9px] text-slate-500 leading-relaxed">Instant &quot;Teal Glow&quot; monitoring and bedside clinical sync.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-teal-400 font-black text-sm">[O]</span>
              <div>
                <p className="text-[10px] font-bold text-slate-100 uppercase tracking-tight">Outcomes</p>
                <p className="text-[9px] text-slate-500 leading-relaxed">Reduced re-hospitalizations and optimized discharge paths.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-white/5 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">
            Validated by ModernQure Intelligence
          </div>
        </div>
      </div>

      {/* Facility Selector */}
      <div className="px-5 py-4">
        <div className="relative">
          <button 
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm border border-white/10 group shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${(activeFacility?.id || staff?.facility_id) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <div className="text-left">
                <p className="text-teal-500 font-black text-[10px] uppercase tracking-widest leading-none mb-1">Active Facility</p>
                <p className="text-slate-200 font-bold text-xs truncate max-w-[120px]">{currentFacilityName}</p>
              </div>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isSwitcherOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <p className="px-3 py-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Switch House</p>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {facilities.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => {
                      switchFacility(f.id);
                      setIsSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all mb-1 flex items-center justify-between ${
                      f.id === (activeFacility?.id || staff?.facility_id) 
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                        : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{f.name}</span>
                    {f.id === (activeFacility?.id || staff?.facility_id) && <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {/* Core Links */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
                isActive 
                  ? 'bg-white/5 text-teal-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-500 rounded-r-full shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              )}
              <item.icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'} />
              <span className={`font-bold tracking-tight ${isActive ? 'text-white' : ''}`}>{item.label}</span>
            </Link>
          );
        })}

        {/* Client Admin Links (Manager / DON) */}
        {(staff?.role === 'CLIENT_ADMIN' || staff?.role === 'FACILITY_ADMIN' || staff?.role === 'admin' || staff?.role === 'nurse' || staff?.role === 'physician') && (
          <div className="pt-6 mt-6 border-t border-white/5">
            <p className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Management</p>
            <Link
              href="/admin/facilities"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === '/admin/facilities' ? 'bg-white/5 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 size={18} />
              <span className="font-bold">Houses / Facilities</span>
            </Link>
            <Link
              href="/admin/staff"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === '/admin/staff' ? 'bg-white/5 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={18} />
              <span className="font-bold">Staff Roster</span>
            </Link>
            <Link
              href="/admin/facility"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === '/admin/facility' ? 'bg-white/5 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings size={18} />
              <span className="font-bold">Global Settings</span>
            </Link>
            <Link
              href="/audit"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === '/audit' ? 'bg-white/5 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield size={18} />
              <span className="font-bold">Compliance Audits</span>
            </Link>
          </div>
        )}

        {/* Master Admin Links */}
        {(staff?.role === 'APP_OWNER' || staff?.role === 'APP_TECH' || staff?.role === 'SUPER_ADMIN' || staff?.role === 'super_admin') && (
          <div className="pt-6 mt-6 border-t border-white/5">
            <p className="px-3 mb-2 text-[10px] font-black text-rose-500 uppercase tracking-widest">Master Console</p>
            <Link
              href="/admin/master"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                pathname === '/admin/master' ? 'bg-white/5 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldAlert size={18} />
              <span className="font-bold">Infrastructure</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Actions */}
      <div className="px-4 py-4 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
        >
          <Settings size={14} />
          <span>My Profile</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 py-6 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 px-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-xl ${
            (staff?.role === 'APP_OWNER' || staff?.role === 'APP_TECH' || staff?.role === 'SUPER_ADMIN' || staff?.role === 'super_admin') ? 'bg-rose-500 text-white' : 'bg-teal-500 text-white'
          }`}>
            {staff?.initials || user?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-100 truncate uppercase tracking-tight">
              {staff?.first_name} {staff?.last_name}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                {staff?.role?.replace('_', ' ')}
              </p>
              {organization?.id === 'GHOST_MODE' && (
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Ghost size={10} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
