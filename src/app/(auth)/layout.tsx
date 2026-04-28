// ============================================================
// Quro — Auth Layout (No Sidebar)
// Shared layout for login/register/onboarding pages
// ============================================================
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quro — Sign In',
  description: 'Sign in to your Quro CLHF care management portal.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}
