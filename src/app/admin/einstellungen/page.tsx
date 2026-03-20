"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Calendar,
  Clock,
  Package,
  Users,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = [
  { value: 1, label: "Mo" },
  { value: 2, label: "Di" },
  { value: 3, label: "Mi" },
  { value: 4, label: "Do" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
  { value: 7, label: "So" },
];

interface SettingsData {
  venue: { id: string; name: string; slug: string };
  season: {
    id: string;
    seasonStart: string;
    seasonEnd: string;
    activeWeekdays: number[];
    pricePerPerson: number;
    currency: string;
    holdMinutes: number;
    maxPersonsPerBooking: number;
    minPersonsPerBooking: number;
  } | null;
  timeSlots: {
    id: string;
    label: string | null;
    startTime: string;
    endTime: string | null;
    isActive: boolean;
  }[];
  addOns: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    priceType: string;
    isActive: boolean;
    sortOrder: number;
  }[];
  capacityRules: {
    id: string;
    minPersons: number;
    maxPersons: number;
    tables: number;
  }[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export default function EinstellungenPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Season Form State
  const [seasonForm, setSeasonForm] = useState({
    seasonStart: "",
    seasonEnd: "",
    activeWeekdays: [1, 2, 3, 4, 5, 6] as number[],
    pricePerPerson: 69,
    currency: "EUR",
    holdMinutes: 15,
    maxPersonsPerBooking: 70,
    minPersonsPerBooking: 10,
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const d: SettingsData = await res.json();
        setData(d);
        if (d.season) {
          setSeasonForm({
            seasonStart: d.season.seasonStart,
            seasonEnd: d.season.seasonEnd,
            activeWeekdays: d.season.activeWeekdays,
            pricePerPerson: d.season.pricePerPerson,
            currency: d.season.currency,
            holdMinutes: d.season.holdMinutes,
            maxPersonsPerBooking: d.season.maxPersonsPerBooking,
            minPersonsPerBooking: d.season.minPersonsPerBooking,
          });
        }
      }
    } catch {
      // Fehler
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSeason = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seasonForm),
      });
      if (res.ok) {
        showToast("success", "Saison-Einstellungen gespeichert!");
        loadSettings();
      } else {
        const err = await res.json();
        showToast("error", err.message || "Fehler beim Speichern.");
      }
    } catch {
      showToast("error", "Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekday = (day: number) => {
    setSeasonForm((prev) => ({
      ...prev,
      activeWeekdays: prev.activeWeekdays.includes(day)
        ? prev.activeWeekdays.filter((d) => d !== day)
        : [...prev.activeWeekdays, day].sort(),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Einstellungen werden geladen...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all",
            toast.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-gray-500">
            Saison, Preise, Zeitfenster, Add-ons und Regeln konfigurieren
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Neu laden
        </Button>
      </div>

      {/* ═══ SAISON ═══════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-coral" />
            Saisonzeitraum & Preise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Startdatum */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Saisonstart
              </label>
              <input
                type="date"
                value={seasonForm.seasonStart}
                onChange={(e) =>
                  setSeasonForm((p) => ({ ...p, seasonStart: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>

            {/* Enddatum */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Saisonende
              </label>
              <input
                type="date"
                value={seasonForm.seasonEnd}
                onChange={(e) =>
                  setSeasonForm((p) => ({ ...p, seasonEnd: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>

            {/* Preis pro Person */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Preis pro Person (€)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={seasonForm.pricePerPerson}
                onChange={(e) =>
                  setSeasonForm((p) => ({
                    ...p,
                    pricePerPerson: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>

            {/* Min/Max Personen */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Min. Personen pro Buchung
              </label>
              <input
                type="number"
                min={1}
                value={seasonForm.minPersonsPerBooking}
                onChange={(e) =>
                  setSeasonForm((p) => ({
                    ...p,
                    minPersonsPerBooking: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Max. Personen pro Buchung
              </label>
              <input
                type="number"
                min={1}
                value={seasonForm.maxPersonsPerBooking}
                onChange={(e) =>
                  setSeasonForm((p) => ({
                    ...p,
                    maxPersonsPerBooking: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>

            {/* Hold Minutes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reservierung halten (Minuten)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={seasonForm.holdMinutes}
                onChange={(e) =>
                  setSeasonForm((p) => ({
                    ...p,
                    holdMinutes: parseInt(e.target.value) || 15,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
          </div>

          {/* Wochentage */}
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Aktive Wochentage
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((wd) => (
                <button
                  key={wd.value}
                  onClick={() => toggleWeekday(wd.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    seasonForm.activeWeekdays.includes(wd.value)
                      ? "border-coral bg-coral/10 text-coral"
                      : "border-gray-300 text-gray-500 hover:border-gray-400"
                  )}
                >
                  {wd.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveSeason} isLoading={saving}>
              <Save className="mr-2 h-4 w-4" />
              Saison speichern
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ ZEITFENSTER ══════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-coral" />
            Zeitfenster
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.timeSlots.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Zeitfenster konfiguriert.</p>
          ) : (
            <div className="space-y-2">
              {data?.timeSlots.map((ts) => (
                <div
                  key={ts.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    ts.isActive
                      ? "border-green-200 bg-white"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        ts.isActive ? "bg-green-500" : "bg-gray-400"
                      )}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        {ts.startTime}
                        {ts.endTime ? ` – ${ts.endTime}` : ""} Uhr
                      </span>
                      {ts.label && (
                        <span className="ml-2 text-sm text-gray-500">
                          ({ts.label})
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      ts.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-white text-gray-500 border border-gray-200"
                    )}
                  >
                    {ts.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ ADD-ONS ══════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-coral" />
            Extras / Add-ons
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.addOns.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Add-ons konfiguriert.</p>
          ) : (
            <div className="space-y-2">
              {data?.addOns.map((addon) => (
                <div
                  key={addon.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    addon.isActive
                      ? "border-green-200 bg-white"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {addon.name}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          addon.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-white text-gray-500 border border-gray-200"
                        )}
                      >
                        {addon.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                    {addon.description && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {addon.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {formatMoney(addon.price)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {addon.priceType === "PER_PERSON"
                        ? "pro Person"
                        : "Festpreis"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ KAPAZITÄTSREGELN ═════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-coral" />
            Kapazitätsregeln
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.capacityRules.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Regeln konfiguriert.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Min. Personen</th>
                    <th className="pb-2 pr-4 font-medium">Max. Personen</th>
                    <th className="pb-2 font-medium">Benötigte Tische</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.capacityRules.map((rule) => (
                    <tr key={rule.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-medium">{rule.minPersons}</td>
                      <td className="py-2 pr-4 font-medium">{rule.maxPersons}</td>
                      <td className="py-2">
                        <span className="rounded-full bg-coral/10 px-3 py-0.5 font-bold text-coral">
                          {rule.tables} {rule.tables === 1 ? "Tisch" : "Tische"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ VENUE INFO ══════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-coral" />
            Venue-Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="font-medium">{data?.venue.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Slug</p>
              <p className="font-mono text-sm">{data?.venue.slug}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ID</p>
              <p className="font-mono text-xs text-gray-400">{data?.venue.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
