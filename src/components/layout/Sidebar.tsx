// ============================================================
// Quro — Sidebar Navigation
// ============================================================
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QuroLogo from '@/components/brand/QuroLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Pill,
  ClipboardList,
  Activity,
  FileText,
  ArrowRightLeft,
  Phone,
  ShieldAlert,
  ScrollText,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/census', label: 'Canants', icon: Users },
  { href: '/patients', label: 'Patients', icon: Activity },
  { href: '/notifications', label: 'Notifications', icon: ClipboardList, hasSubmenu: true },
  { href: '/users', label: 'Users', icon: Users, hasSubmenu: true },
  { href: '/status', label: 'Status', icon: ShieldAlert },
  { href: '/clients', label: 'Clients', icon: FileText },
];

const footerItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/logout', label: 'Log out', icon: LogOut },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, staff, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <QuroLogo size={36} showText variant="full" />
      </div>

      {/* Facility Selector */}
      <div className="px-5 py-4">
        <div className="relative group">
          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/8 transition-colors text-sm border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <p className="text-slate-200 font-bold text-[10px] uppercase tracking-widest leading-none mb-1">Current Facility</p>
                <p className="text-slate-400 font-medium text-xs truncate">Cedar House (25 Beds)</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Dropdown Placeholder (Visual Only for now) */}
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-50">
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 font-medium mb-1">Willow House (25 Beds)</button>
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 font-medium">Oak House (25 Beds)</button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {/* Core Links */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group relative ${
                isActive 
                  ? 'bg-white/5 text-teal-400' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-500 rounded-r-full shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              )}
              <div className="flex items-center gap-3">
                <item.icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className={`font-medium tracking-wide ${isActive ? 'text-white' : ''}`}>{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Dynamic Admin Links */}
        {staff?.role === 'SUPER_ADMIN' && (
          <div className="pt-4 border-t border-white/5 mt-4">
            <p className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Access</p>
            <Link
              href="/admin/master"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                pathname === '/admin/master' ? 'bg-white/5 text-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert size={18} />
              <span className="font-medium">Master Console</span>
            </Link>
          </div>
        )}

        {staff?.role === 'FACILITY_ADMIN' && (
          <div className="pt-4 border-t border-white/5 mt-4">
            <p className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Administration</p>
            <Link
              href="/admin/facility"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                pathname === '/admin/facility' ? 'bg-white/5 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings size={18} />
              <span className="font-medium">Facility Manager</span>
            </Link>
            <Link
              href="/admin/staff"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                pathname === '/admin/staff' ? 'bg-white/5 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={18} />
              <span className="font-medium">Staff Roster</span>
            </Link>
          </div>
        )}

        <div className="pt-8 space-y-2">
          {footerItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <item.icon size={18} />
              <span className="font-medium tracking-wide">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Profile Footer */}
      <div className="px-4 py-6 border-t border-white/5">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-800 text-[10px] font-black">
            {staff?.initials || user?.displayName?.charAt(0) || 'JD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-200 truncate">Profile</p>
          </div>
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </aside>
  );
}
