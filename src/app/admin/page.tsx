"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  CalendarDays,
  Users,
  CreditCard,
  LayoutGrid,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardData {
  kpis: {
    bookingsToday: number;
    guestsThisWeek: number;
    revenueMonth: number;
    totalTables: number;
    availableTables: number;
    reservedTablesToday: number;
  };
  stats: {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    pendingBookings: number;
  };
  recentBookings: {
    id: string;
    bookingNumber: string;
    companyName: string;
    contactName: string;
    date: string;
    timeSlot: string;
    personCount: number;
    total: number;
    status: string;
    paymentStatus: string | null;
    createdAt: string;
  }[];
  upcomingBookings: {
    id: string;
    bookingNumber: string;
    companyName: string;
    date: string;
    timeSlot: string;
    personCount: number;
    status: string;
  }[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // Fehler ignorieren
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Übersicht über alle Buchungen</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Buchungen heute
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "…" : data?.kpis.bookingsToday ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Gäste diese Woche
            </CardTitle>
            <Users className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "…" : data?.kpis.guestsThisWeek ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Umsatz (Monat)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "…" : formatMoney(data?.kpis.revenueMonth ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Verfügbare Tische
            </CardTitle>
            <LayoutGrid className="h-4 w-4 text-coral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? "…"
                : `${data?.kpis.availableTables ?? 0} / ${data?.kpis.totalTables ?? 0}`}
            </div>
            {data && data.kpis.reservedTablesToday > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {data.kpis.reservedTablesToday} heute reserviert
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistik-Übersicht */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data.stats.totalBookings}</p>
            <p className="text-xs text-gray-500">Gesamt</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{data.stats.confirmedBookings}</p>
            <p className="text-xs text-green-600">Bestätigt</p>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{data.stats.pendingBookings}</p>
            <p className="text-xs text-yellow-600">Ausstehend</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{data.stats.cancelledBookings}</p>
            <p className="text-xs text-red-600">Storniert</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Letzte Buchungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-coral" />
              Letzte Buchungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-4 text-center text-sm text-gray-400">Laden...</p>
            ) : !data?.recentBookings.length ? (
              <p className="py-4 text-center text-sm text-gray-400">
                Noch keine Buchungen vorhanden.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">
                          #{b.bookingNumber}
                        </span>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
                        {b.companyName || b.contactName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(b.date)} · {b.timeSlot} Uhr · {b.personCount} Pers.
                      </p>
                    </div>
                    <div className="ml-3 text-right">
                      <p className="font-semibold text-gray-900">
                        {formatMoney(b.total)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(b.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anstehende Buchungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-coral" />
              Nächste Buchungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-4 text-center text-sm text-gray-400">Laden...</p>
            ) : !data?.upcomingBookings.length ? (
              <p className="py-4 text-center text-sm text-gray-400">
                Keine anstehenden Buchungen.
              </p>
            ) : (
              <div className="space-y-3">
                {data.upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {b.companyName || "–"}
                      </p>
                      <p className="text-xs text-gray-500">
                        #{b.bookingNumber} · {b.personCount} Personen
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(b.date)}
                      </p>
                      <p className="text-xs text-gray-500">{b.timeSlot} Uhr</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
