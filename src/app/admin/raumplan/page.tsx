"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  Calendar,
  Clock,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FloorplanTable {
  id: string;
  label: string;
  seats: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
  shape: string;
  isActive: boolean;
  status: "FREE" | "BLOCKED" | "RESERVED" | "HELD";
  booking: {
    bookingNumber: string;
    companyName: string;
    personCount: number;
  } | null;
}

interface FloorplanArea {
  id: string;
  name: string;
  tables: FloorplanTable[];
}

interface TimeSlotOption {
  id: string;
  label: string | null;
  startTime: string;
}

export default function RaumplanPage() {
  const [areas, setAreas] = useState<FloorplanArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedTable, setSelectedTable] = useState<FloorplanTable | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "visual">("grid");

  // Venue ID (Default Venue)
  const [venueId, setVenueId] = useState("");

  // Slots + VenueId laden
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setVenueId(data.venue.id);
          setSlots(
            data.timeSlots
              .filter((ts: TimeSlotOption & { isActive: boolean }) => ts.isActive)
              .map((ts: TimeSlotOption & { isActive: boolean }) => ({
                id: ts.id,
                label: ts.label,
                startTime: ts.startTime,
              }))
          );
          if (data.timeSlots.length > 0) {
            setSelectedSlot(data.timeSlots[0].id);
          }
        }
      } catch {
        // Fehler
      }
    }
    loadSettings();
  }, []);

  const loadFloorplan = useCallback(async () => {
    if (!venueId || !selectedSlot) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        venueId,
        date: selectedDate,
        slotId: selectedSlot,
      });
      const res = await fetch(`/api/admin/floorplan?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAreas(data.areas);
      }
    } catch {
      // Fehler
    } finally {
      setLoading(false);
    }
  }, [venueId, selectedDate, selectedSlot]);

  useEffect(() => {
    loadFloorplan();
  }, [loadFloorplan]);

  const handleToggleTable = async (tableId: string, newActive: boolean) => {
    setToggling(tableId);
    try {
      const res = await fetch(`/api/admin/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      if (res.ok) {
        loadFloorplan();
      }
    } catch {
      // Fehler
    } finally {
      setToggling(null);
    }
  };

  // Statistiken berechnen
  const allTables = areas.flatMap((a) => a.tables);
  const totalTables = allTables.length;
  const freeTables = allTables.filter((t) => t.status === "FREE").length;
  const reservedTables = allTables.filter((t) => t.status === "RESERVED").length;
  const heldTables = allTables.filter((t) => t.status === "HELD").length;
  const blockedTables = allTables.filter((t) => t.status === "BLOCKED").length;

  const statusColor = (status: string) => {
    switch (status) {
      case "FREE":
        return "bg-white border-green-300 text-green-800";
      case "RESERVED":
        return "bg-white border-coral/30 text-coral";
      case "HELD":
        return "bg-white border-blue-300 text-blue-800";
      case "BLOCKED":
        return "bg-white border-gray-300 text-gray-500";
      default:
        return "bg-white border-gray-300 text-gray-600";
    }
  };

  const statusDot = (status: string) => {
    switch (status) {
      case "FREE":
        return "bg-green-500";
      case "RESERVED":
        return "bg-coral";
      case "HELD":
        return "bg-blue-500";
      case "BLOCKED":
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "FREE":
        return "Frei";
      case "RESERVED":
        return "Reserviert";
      case "HELD":
        return "Gehalten";
      case "BLOCKED":
        return "Gesperrt";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raumplan</h1>
          <p className="text-gray-500">
            Tische verwalten, sperren und Reservierungen ansehen
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadFloorplan}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.startTime} Uhr{s.label ? ` – ${s.label}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto flex gap-1 rounded-lg border border-gray-200 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  viewMode === "grid"
                    ? "bg-coral text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Gitter
              </button>
              <button
                onClick={() => setViewMode("visual")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  viewMode === "visual"
                    ? "bg-coral text-white"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                Visuell
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistik-Leiste */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{totalTables}</p>
          <p className="text-xs text-gray-500">Gesamt</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-white p-3 text-center">
          <p className="text-lg font-bold text-green-700">{freeTables}</p>
          <p className="text-xs text-green-600">Frei</p>
        </div>
        <div className="rounded-lg border border-coral/20 bg-white p-3 text-center">
          <p className="text-lg font-bold text-coral">{reservedTables}</p>
          <p className="text-xs text-coral/80">Reserviert</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-white p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{heldTables}</p>
          <p className="text-xs text-blue-600">Gehalten</p>
        </div>
        <div className="rounded-lg border border-gray-300 p-3 text-center">
          <p className="text-lg font-bold text-gray-600">{blockedTables}</p>
          <p className="text-xs text-gray-500">Gesperrt</p>
        </div>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        {[
          { label: "Frei", color: "bg-green-500" },
          { label: "Reserviert", color: "bg-coral" },
          { label: "Gehalten", color: "bg-blue-500" },
          { label: "Gesperrt", color: "bg-gray-400" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
            {item.label}
          </div>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            Raumplan wird geladen...
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* ═══ GITTER-ANSICHT – 2 Reihen à 15 Tische ════════════ */
        <div className="space-y-6">
          {areas.map((area) => {
            const sorted = [...area.tables].sort((a, b) => {
              const numA = parseInt(a.label.replace(/\D/g, "")) || 0;
              const numB = parseInt(b.label.replace(/\D/g, "")) || 0;
              return numA - numB;
            });
            const row1 = sorted.slice(0, 15);
            const row2 = sorted.slice(15, 30);

            return (
              <Card key={area.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutGrid className="h-4 w-4 text-coral" />
                    {area.name}
                    <span className="text-sm font-normal text-gray-400">
                      ({area.tables.length} Tische)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Reihe 1: T1–T15 */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Reihe 1 · Tisch 1–15
                      </p>
                      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 xl:grid-cols-15">
                        {row1.map((table) => (
                          <button
                            key={table.id}
                            onClick={() => setSelectedTable(table)}
                            className={cn(
                              "relative rounded-lg border-2 p-2 text-center transition-all hover:shadow-md",
                              statusColor(table.status),
                              selectedTable?.id === table.id && "ring-2 ring-coral ring-offset-1"
                            )}
                          >
                            <span className="block text-sm font-bold">{table.label}</span>
                            <span className="block text-[10px] opacity-70">
                              {table.seats}P
                            </span>
                            <div className={cn("mx-auto mt-1 h-1.5 w-1.5 rounded-full", statusDot(table.status))} />
                            {table.booking && (
                              <p className="mt-1 truncate text-[9px] font-medium opacity-80">
                                {table.booking.companyName || `#${table.booking.bookingNumber}`}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reihe 2: T16–T30 */}
                    {row2.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Reihe 2 · Tisch 16–30
                        </p>
                        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 xl:grid-cols-15">
                          {row2.map((table) => (
                            <button
                              key={table.id}
                              onClick={() => setSelectedTable(table)}
                              className={cn(
                                "relative rounded-lg border-2 p-2 text-center transition-all hover:shadow-md",
                                statusColor(table.status),
                                selectedTable?.id === table.id && "ring-2 ring-coral ring-offset-1"
                              )}
                            >
                              <span className="block text-sm font-bold">{table.label}</span>
                              <span className="block text-[10px] opacity-70">
                                {table.seats}P
                              </span>
                              <div className={cn("mx-auto mt-1 h-1.5 w-1.5 rounded-full", statusDot(table.status))} />
                              {table.booking && (
                                <p className="mt-1 truncate text-[9px] font-medium opacity-80">
                                  {table.booking.companyName || `#${table.booking.bookingNumber}`}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ═══ VISUELLE ANSICHT – 2 Reihen à 15 rechteckige Tische ═ */
        <Card>
          <CardContent className="p-4">
            {areas.map((area) => {
              const sorted = [...area.tables].sort((a, b) => {
                const numA = parseInt(a.label.replace(/\D/g, "")) || 0;
                const numB = parseInt(b.label.replace(/\D/g, "")) || 0;
                return numA - numB;
              });
              const row1 = sorted.slice(0, 15);
              const row2 = sorted.slice(15, 30);

              return (
                <div key={area.id} className="mb-6 last:mb-0">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">
                    {area.name}
                  </h3>
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-6">
                    {/* Reihe 1 */}
                    <div className="mb-6 flex flex-wrap justify-center gap-3">
                      {row1.map((table) => (
                        <button
                          key={table.id}
                          onClick={() => setSelectedTable(table)}
                          className={cn(
                            "flex h-16 w-20 flex-col items-center justify-center rounded-lg border-2 text-xs font-bold transition-all hover:scale-105 hover:shadow-lg",
                            statusColor(table.status),
                            selectedTable?.id === table.id && "ring-2 ring-coral ring-offset-2"
                          )}
                          title={`${table.label} – ${statusLabel(table.status)}${table.booking ? ` (${table.booking.companyName})` : ""}`}
                        >
                          <span>{table.label}</span>
                          <span className="text-[10px] font-normal opacity-70">
                            {table.seats}P
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Gangbereich */}
                    <div className="mb-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] font-medium uppercase tracking-widest text-gray-300">
                        Gang
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    {/* Reihe 2 */}
                    {row2.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-3">
                        {row2.map((table) => (
                          <button
                            key={table.id}
                            onClick={() => setSelectedTable(table)}
                            className={cn(
                              "flex h-16 w-20 flex-col items-center justify-center rounded-lg border-2 text-xs font-bold transition-all hover:scale-105 hover:shadow-lg",
                              statusColor(table.status),
                              selectedTable?.id === table.id && "ring-2 ring-coral ring-offset-2"
                            )}
                            title={`${table.label} – ${statusLabel(table.status)}${table.booking ? ` (${table.booking.companyName})` : ""}`}
                          >
                            <span>{table.label}</span>
                            <span className="text-[10px] font-normal opacity-70">
                              {table.seats}P
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ═══ TISCH DETAIL PANEL ═════════════════════════════════ */}
      {selectedTable && (
        <Card className="border-coral/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-coral" />
                Tisch {selectedTable.label}
              </CardTitle>
              <button
                onClick={() => setSelectedTable(null)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded-full", statusDot(selectedTable.status))} />
                  <span className="font-medium">{statusLabel(selectedTable.status)}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sitzplätze</p>
                <p className="font-medium">{selectedTable.seats}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Form</p>
                <p className="font-medium">Rechteckig</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Aktiv</p>
                <p className="font-medium">
                  {selectedTable.isActive ? "Ja" : "Nein (Gesperrt)"}
                </p>
              </div>

              {selectedTable.booking && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Aktuelle Buchung</p>
                  <div className="mt-1 rounded-lg border border-coral/20 p-3">
                    <p className="font-medium text-coral">
                      #{selectedTable.booking.bookingNumber}
                    </p>
                    <p className="text-sm text-gray-700">
                      {selectedTable.booking.companyName || "–"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedTable.booking.personCount} Personen
                    </p>
                  </div>
                </div>
              )}

              {/* Aktionen */}
              <div className="sm:col-span-2">
                <div className="flex gap-2">
                  {selectedTable.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleTable(selectedTable.id, false)
                      }
                      disabled={toggling === selectedTable.id}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {toggling === selectedTable.id
                        ? "Wird gesperrt..."
                        : "Tisch sperren"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleToggleTable(selectedTable.id, true)
                      }
                      disabled={toggling === selectedTable.id}
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      {toggling === selectedTable.id
                        ? "Wird freigegeben..."
                        : "Tisch freigeben"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info-Hinweis */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 p-4 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Hinweis</p>
          <p className="mt-0.5 text-xs">
            Gesperrte Tische werden bei neuen Buchungen nicht berücksichtigt.
            Die Tageskapazität wird über alle Zeitfenster geteilt.
          </p>
        </div>
      </div>
    </div>
  );
}
