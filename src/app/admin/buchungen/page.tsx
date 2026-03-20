"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Ban,
  FileText,
  RefreshCw,
  Filter,
} from "lucide-react";

interface BookingListItem {
  id: string;
  bookingNumber: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  vatId: string | null;
  date: string;
  timeSlot: { startTime: string; label: string | null };
  personCount: number;
  tableCount: number;
  tables: string[];
  curlingSlots: { laneName: string; startTime: string; endTime: string }[];
  addOns: { name: string; quantity: number; total: number }[];
  total: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  notes: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type BookingKind = "ALL" | "TABLE" | "CURLING" | "COMBINED";

const STATUS_OPTIONS = [
  { value: "", label: "Alle Status" },
  { value: "HOLD", label: "Gehalten" },
  { value: "PENDING", label: "Ausstehend" },
  { value: "CONFIRMED", label: "Bestätigt" },
  { value: "CANCELLED", label: "Storniert" },
  { value: "EXPIRED", label: "Abgelaufen" },
];

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

export default function BuchungenPage() {
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(
    null
  );
  const [showFilters, setShowFilters] = useState(false);

  // Storno State
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Notizen State
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [kind, setKind] = useState<BookingKind>("ALL");

  const showCurlingColumn = kind !== "TABLE";
  const showPersonsColumn = kind !== "CURLING";

  const loadBookings = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");
        if (search) params.set("search", search);
        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (kind) params.set("kind", kind);

        const res = await fetch(`/api/admin/bookings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings);
          setPagination(data.pagination);
        }
      } catch {
        // Fehler ignorieren
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, dateFrom, dateTo, kind]
  );

  useEffect(() => {
    loadBookings(1);
  }, [loadBookings]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (kind) params.set("kind", kind);
    window.open(`/api/admin/bookings/export?${params.toString()}`, "_blank");
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });
      if (res.ok) {
        setShowCancelDialog(false);
        setCancelReason("");
        setSelectedBooking(null);
        loadBookings(pagination.page);
      }
    } catch {
      // Fehler
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_notes", notes: notesText }),
      });
      if (res.ok) {
        setEditingNotes(false);
        setSelectedBooking({ ...selectedBooking, notes: notesText });
        loadBookings(pagination.page);
      }
    } catch {
      // Fehler
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buchungen</h1>
          <p className="text-gray-500">
            {pagination.total} Buchungen gesamt
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Typ-Filter: Tisch / Eisstock / Kombipakete */}
          <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() => setKind("ALL")}
              className={`rounded-full px-3 py-1 font-medium ${
                kind === "ALL"
                  ? "bg-coral text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => setKind("TABLE")}
              className={`rounded-full px-3 py-1 font-medium ${
                kind === "TABLE"
                  ? "bg-coral text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Tischreservierungen
            </button>
            <button
              type="button"
              onClick={() => setKind("CURLING")}
              className={`rounded-full px-3 py-1 font-medium ${
                kind === "CURLING"
                  ? "bg-coral text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Eisstockschießen
            </button>
            <button
              type="button"
              onClick={() => setKind("COMBINED")}
              className={`rounded-full px-3 py-1 font-medium ${
                kind === "COMBINED"
                  ? "bg-coral text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Kombipakete
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadBookings(pagination.page)}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            CSV Export
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {/* Suche */}
            <div className="relative min-w-[250px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Firma, Name, E-Mail, Buchungsnr..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-1 h-4 w-4" />
              Datumsfilter
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
              <label className="text-sm text-gray-500">Von:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
              <label className="text-sm text-gray-500">Bis:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Zurücksetzen
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Buchungsliste */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Nr.</th>
                  <th className="px-4 py-3 font-medium">Firma / Kontakt</th>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Uhrzeit</th>
                  <th
                    className={`px-4 py-3 font-medium ${
                      showCurlingColumn ? "" : "hidden"
                    }`}
                  >
                    Eisstock
                  </th>
                  <th
                    className={`px-4 py-3 font-medium ${
                      showPersonsColumn ? "" : "hidden"
                    }`}
                  >
                    Pers.
                  </th>
                  <th className="px-4 py-3 font-medium">Betrag</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Zahlung</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      Laden...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      Keine Buchungen gefunden.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-gray-100 transition-colors hover:bg-white"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {b.bookingNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {b.companyName || "–"}
                        </p>
                        <p className="text-xs text-gray-500">{b.contactName}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(b.date)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {b.timeSlot.startTime}
                      </td>
                      <td
                        className={`px-4 py-3 text-gray-700 ${
                          showCurlingColumn ? "" : "hidden"
                        }`}
                      >
                        {b.curlingSlots && b.curlingSlots.length > 0 ? (
                          (() => {
                            const lanes = Array.from(
                              new Set(b.curlingSlots.map((s) => s.laneName))
                            ).length;
                            const starts = b.curlingSlots
                              .map((s) => s.startTime)
                              .sort();
                            const ends = b.curlingSlots
                              .map((s) => s.endTime)
                              .sort();
                            const start = starts[0];
                            const end = ends[ends.length - 1];
                            return `${lanes} Bahn${lanes > 1 ? "en" : ""} · ${start}–${end} Uhr`;
                          })()
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-center text-gray-700 ${
                          showPersonsColumn ? "" : "hidden"
                        }`}
                      >
                        {b.personCount}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatMoney(b.total)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3">
                        {b.paymentStatus ? (
                          <StatusBadge status={b.paymentStatus} />
                        ) : (
                          <span className="text-xs text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBooking(b)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">
                Seite {pagination.page} von {pagination.totalPages} (
                {pagination.total} Einträge)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadBookings(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadBookings(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ DETAIL MODAL ═══════════════════════════════════════ */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Buchung #{selectedBooking.bookingNumber}
                </h2>
                <div className="mt-1 flex gap-2">
                  <StatusBadge status={selectedBooking.status} />
                  {selectedBooking.paymentStatus && (
                    <StatusBadge status={selectedBooking.paymentStatus} />
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setEditingNotes(false);
                  setShowCancelDialog(false);
                }}
                className="rounded-lg p-1 hover:bg-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-6">
              {/* Info Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Firma</p>
                  <p className="font-medium">{selectedBooking.companyName || "–"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ansprechpartner</p>
                  <p className="font-medium">{selectedBooking.contactName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">E-Mail</p>
                  <p className="font-medium">
                    <a
                      href={`mailto:${selectedBooking.email}`}
                      className="text-coral underline"
                    >
                      {selectedBooking.email}
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Telefon</p>
                  <p className="font-medium">
                    <a
                      href={`tel:${selectedBooking.phone}`}
                      className="text-coral underline"
                    >
                      {selectedBooking.phone}
                    </a>
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Adresse</p>
                  <p className="font-medium">
                    {selectedBooking.address}
                  </p>
                </div>
                {selectedBooking.vatId && (
                  <div>
                    <p className="text-xs text-gray-500">USt-IdNr.</p>
                    <p className="font-medium">{selectedBooking.vatId}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Datum</p>
                  <p className="font-medium">{formatDate(selectedBooking.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Uhrzeit</p>
                  <p className="font-medium">
                    {selectedBooking.timeSlot.startTime} Uhr
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Personen</p>
                  <p className="font-medium">{selectedBooking.personCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tische</p>
                  <p className="font-medium">
                    {selectedBooking.tableCount} (
                    {selectedBooking.tables.join(", ") || "–"})
                  </p>
                </div>
                {selectedBooking.curlingSlots &&
                  selectedBooking.curlingSlots.length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">Eisstockschießen</p>
                      <div className="mt-1 space-y-0.5 text-sm">
                        {selectedBooking.curlingSlots.map((slot, idx) => (
                          <p key={idx} className="font-medium text-gray-800">
                            {slot.laneName}: {slot.startTime} – {slot.endTime} Uhr
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Add-ons */}
              {selectedBooking.addOns.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-gray-500">Extras</p>
                  <div className="rounded-lg border border-gray-100 p-3">
                    {selectedBooking.addOns.map((a, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {a.name} ({a.quantity}×)
                        </span>
                        <span className="font-medium">
                          {formatMoney(a.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gesamtbetrag */}
              <div className="rounded-lg bg-landhaus-green/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Gesamtbetrag
                  </span>
                  <span className="text-xl font-bold text-landhaus-green">
                    {formatMoney(selectedBooking.total)}
                  </span>
                </div>
              </div>

              {/* Notizen */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-gray-500">Notizen</p>
                  {!editingNotes && (
                    <button
                      onClick={() => {
                        setNotesText(selectedBooking.notes || "");
                        setEditingNotes(true);
                      }}
                      className="text-xs text-coral hover:underline"
                    >
                      <FileText className="mr-1 inline h-3 w-3" />
                      Bearbeiten
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        isLoading={savingNotes}
                      >
                        Speichern
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNotes(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-gray-100 p-3 text-sm text-gray-600">
                    {selectedBooking.notes || "Keine Notizen."}
                  </p>
                )}
              </div>

              {/* Erstellt */}
              <p className="text-xs text-gray-400">
                Erstellt: {new Date(selectedBooking.createdAt).toLocaleString("de-DE")}
              </p>
            </div>

            {/* Footer mit Aktionen */}
            <div className="flex items-center justify-between border-t px-6 py-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedBooking(null);
                  setEditingNotes(false);
                  setShowCancelDialog(false);
                }}
              >
                Schließen
              </Button>

              {selectedBooking.status !== "CANCELLED" &&
                selectedBooking.status !== "EXPIRED" && (
                  <>
                    {!showCancelDialog ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowCancelDialog(true)}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Stornieren
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Stornierungsgrund (optional)"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-48 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleCancel}
                          isLoading={cancelling}
                        >
                          Bestätigen
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowCancelDialog(false);
                            setCancelReason("");
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    )}
                  </>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
