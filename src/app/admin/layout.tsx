"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { AdminSidebar } from "@/components/admin/sidebar";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (status === "authenticated" && isLoginPage) {
      router.replace("/admin");
    }
    if (status === "unauthenticated" && !isLoginPage) {
      router.replace("/admin/login");
    }
  }, [status, isLoginPage, router]);

  // Login-Seite: Kein Auth-Check, kein Sidebar, direkt rendern
  if (isLoginPage) {
    if (status === "loading") {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-coral" />
            Laden...
          </div>
        </div>
      );
    }
    // Wenn authentifiziert → Redirect läuft via useEffect
    if (status === "authenticated") {
      return null;
    }
    return <>{children}</>;
  }

  // Geschützte Seiten: Loading-Zustand
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-coral" />
          Laden...
        </div>
      </div>
    );
  }

  // Nicht eingeloggt → Redirect läuft via useEffect
  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AdminSidebar />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
