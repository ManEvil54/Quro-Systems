// ============================================================
// Quro — Root Layout
// Wraps entire app with AuthProvider
// ============================================================
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: {
    default: "Quro — The Active Clinical Partner for Modern Healthcare",
    template: "%s | Quro Systems"
  },
  description: "Transform your facility with Quro. The AI-driven clinical partner designed for noise reduction, zero mental clutter, and precision care synchronization in Congregate Living Health Facilities (CLHF).",
  keywords: [
    "CLHF software", 
    "clinical intelligence", 
    "AI healthcare partner", 
    "medication management", 
    "MAR automation", 
    "sub-acute care", 
    "HIPAA compliant EHR", 
    "care synchronization"
  ],
  authors: [{ name: "ModernQure LLC" }],
  creator: "ModernQure LLC",
  publisher: "ModernQure LLC",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Quro — The Active Clinical Partner",
    description: "The AI-driven clinical platform designed to reduce cognitive load and eliminate handover errors in high-stakes healthcare environments.",
    url: "https://qurosystems.com",
    siteName: "Quro Systems",
    images: [
      {
        url: "/og-image.png", // Ensure this exists or I should generate one
        width: 1200,
        height: 630,
        alt: "Quro Systems Clinical Intelligence Dashboard",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quro — Precision Care, Synchronized.",
    description: "AI-powered noise reduction for sub-acute clinical teams.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://qurosystems.com"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
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
