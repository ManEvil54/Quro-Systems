// ============================================================
// Quro — Root Layout
// Wraps entire app with AuthProvider
// ============================================================
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Quro — CLHF Care Synchronization",
  description: "HIPAA-compliant sub-acute care management for Congregate Living Health Facilities. Quro Systems by ModernQure LLC.",
  keywords: ["CLHF", "healthcare", "medication management", "MAR", "sub-acute care", "HIPAA"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
