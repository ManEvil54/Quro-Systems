// ============================================================
// Quro — App Layout (Authenticated Shell)
// Sidebar + ProtectedRoute wrapper for all app pages
// ============================================================
import Sidebar from "@/components/layout/Sidebar";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </ProtectedRoute>
  );
}
