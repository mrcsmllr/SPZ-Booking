"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  CalendarDays,
  LayoutGrid,
  Settings,
  LogOut,
  TreePine,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/buchungen", label: "Buchungen", icon: CalendarDays },
  { href: "/admin/raumplan", label: "Raumplan", icon: LayoutGrid },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-landhaus-green/10">
          <TreePine className="h-5 w-5 text-landhaus-green" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">SPZ Admin</p>
          <p className="text-xs text-gray-400">Buchungsverwaltung</p>
        </div>
      </div>

      {/* Zur Buchungsseite */}
      <div className="border-b border-gray-200 px-6 py-3">
        <Link
          href="/buchen"
          className="inline-flex w-full items-center justify-center rounded-lg bg-coral px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-light"
          onClick={() => setMobileOpen(false)}
        >
          Zur Buchungsseite
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-coral/10 text-coral"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 px-3 py-4">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5 text-landhaus-green" />
          <span className="text-sm font-bold text-gray-900">SPZ Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/buchen"
            className="rounded-lg border border-landhaus-cream-dark bg-white px-3 py-1 text-xs font-medium text-landhaus-brown transition-colors hover:bg-landhaus-cream"
          >
            Buchungsseite
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        {navContent}
      </aside>
    </>
  );
}
