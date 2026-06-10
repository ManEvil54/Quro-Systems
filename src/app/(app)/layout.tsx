'use client';

import Sidebar from "@/components/layout/Sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import GhostModeBanner from "@/components/auth/GhostModeBanner";
import OnboardingModal from "@/components/auth/OnboardingModal";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isImpersonating } = useAuth();

  return (
    <ProtectedRoute>
      <GhostModeBanner />
      <OnboardingModal />
      <div className={`flex min-h-screen ${isImpersonating ? 'pt-10' : ''}`}>
        <Sidebar />
        <main className="main-content flex-1">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
