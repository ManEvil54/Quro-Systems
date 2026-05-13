// ============================================================
// Quro — Root Layout
// Wraps entire app with AuthProvider
// ============================================================
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: {
    default: "Quro Systems | Quality Understanding • Real-time Outcomes",
    template: "%s | Quro Systems",
  },
  description: "Evolved clinical operations for skilled nursing facilities. Reduce cognitive load and achieve real-time patient outcomes with Quro Systems.",
  keywords: ["SNF Software", "CLHF Management", "Clinical Synchronization", "Nursing MAR", "Healthcare AI"],
  authors: [{ name: "ModernQure LLC" }],
  openGraph: {
    title: "Quro Systems",
    description: "Quality Understanding • Real-time Outcomes",
    url: "https://www.qurosystems.com",
    siteName: "Quro Systems",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  metadataBase: new URL("https://www.qurosystems.com"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488", // Quro Teal
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
