// ============================================================
// Quro — Protected Route Guard
// Redirects unauthenticated users to /login
// ============================================================
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { StaffRole } from '@/lib/firebase/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, staff, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Loading state — premium skeleton
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-slate-400 font-medium">Loading Quro...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) return null;

  // Role check — SUPER_ADMIN has global bypass
  if (allowedRoles && staff && staff.role !== 'SUPER_ADMIN' && !allowedRoles.includes(staff.role)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Access Restricted</h3>
          <p className="text-sm text-slate-500">Your role does not have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
