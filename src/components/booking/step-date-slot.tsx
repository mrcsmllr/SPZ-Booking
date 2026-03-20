"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useBookingStore,
  SEATS_PER_TABLE,
  getCurlingHours,
  getVenueClosingHour,
} from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Info,
  Snowflake,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/date";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  getISODay,
} from "date-fns";
import { de } from "date-fns/locale";
import type { CurlingSlotSelection, CurlingLaneAvailability } from "@/types/booking";

// Saison: 01.11.2026 – 31.01.2027
const SEASON_START = new Date(2026, 10, 1);
const SEASON_END = new Date(2027, 0, 31);

interface MonthAvailability {
  dates: Record<
    string,
    {
      available: boolean;
      availableSeats: number;
      availableTables: number;
      reason?: string;
    }
  >;
  totalSeats: number;
  totalTables: number;
  venueId: string;
}

interface TimeSlotFromDB {
  id: string;
  startTime: string;
  endTime: string | null;
  label: string | null;
  totalTables: number;
  reservedTables: number;
  availableTables: number;
  isAvailable: boolean;
}

/**
 * Mindest-Starthour für einen ISO-Wochentag.
 * Mo-Fr (1-5): ab 16 Uhr
 * Sa (6):      ab 14 Uhr
 * So (7):      ab 12 Uhr
 */
function getMinStartHour(isoDay: number): number {
  if (isoDay >= 1 && isoDay <= 5) return 16;
  if (isoDay === 6) return 14;
  return 12; // Sonntag
}

/**
 * Max Starthour für einen ISO-Wochentag.
 * So (7): 16 (16-20=4h) - schließt um 20 Uhr
 * Alle anderen: 19 (19-22=3h)
 */
function getMaxStartHour(isoDay: number): number {
  if (isoDay === 7) return 16; // Sonntag schließt um 20:00
  return 19; // Mo-Sa schließt um 22:00
}

/**
 * Slot-Dauer in Stunden abhängig vom Wochentag.
 * Sonntag: immer 4h (schließt um 20:00, letzter Slot = 16:00)
 * Andere: 19:00 = 3h (bis 22:00), alle anderen = 4h.
 */
function getSlotDuration(startHour: number, isoDay: number): number {
  if (isoDay === 7) return 4; // Sonntag: immer 4h
  return startHour === 19 ? 3 : 4;
}

const MAX_CURLING_HOURS_PER_LANE = 2;
const MAX_CURLING_TOTAL_SLOTS = 4;

export function StepDateSlot() {
  const { data, updateData, nextStep, prevStep } = useBookingStore();
  const isCombined = data.bookingType === "COMBINED";
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 10, 1));
  const [monthData, setMonthData] = useState<MonthAvailability | null>(null);
  const [loading, setLoading] = useState(false);

  // Slots für das gewählte Datum
  const [slotsForDate, setSlotsForDate] = useState<TimeSlotFromDB[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [venueId, setVenueId] = useState<string>("");

  // Curling-Daten (nur bei COMBINED)
  const [laneData, setLaneData] = useState<CurlingLaneAvailability[]>([]);
  const [curlingLoading, setCurlingLoading] = useState(false);

  const slotsRef = useRef<HTMLDivElement>(null);

  const personCount = data.personCount || 10;
  const requiredTables = Math.ceil(personCount / SEATS_PER_TABLE);
  const selectedCurlingSlots = data.curlingSlots || [];

  // ──────────────────── Monatsdaten laden ────────────────────
  const loadMonthData = useCallback(
    async (month: Date) => {
      setLoading(true);
      try {
        const monthStr = format(month, "yyyy-MM");
        const response = await fetch(
          `/api/public/availability/month?month=${monthStr}&personCount=${personCount}`
        );
        const result = await response.json();
        setMonthData(result);
        if (result.venueId) {
          setVenueId(result.venueId);
          updateData({ venueId: result.venueId });
        }
      } catch {
        setMonthData(null);
      } finally {
        setLoading(false);
      }
    },
    [personCount, updateData]
  );

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth, loadMonthData]);

  // ──────────────────── Slots für Datum laden ────────────────
  const loadSlotsForDate = useCallback(
    async (dateStr: string, vid: string) => {
      setSlotsLoading(true);
      try {
        const response = await fetch(
          `/api/public/availability?date=${dateStr}&venueId=${vid}`
        );
        const result = await response.json();
        if (result.slots) {
          setSlotsForDate(result.slots);
        }
      } catch {
        setSlotsForDate([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    []
  );

  // ──────────────────── Curling-Daten laden (COMBINED) ───────
  const loadCurlingData = useCallback(
    async (dateStr: string, vid: string) => {
      setCurlingLoading(true);
      try {
        const response = await fetch(
          `/api/public/curling/availability?date=${dateStr}&venueId=${vid}`
        );
        const result = await response.json();
        setLaneData(result.lanes || []);
      } catch {
        setLaneData([]);
      } finally {
        setCurlingLoading(false);
      }
    },
    []
  );

  // Wenn Datum sich ändert → Slots laden
  useEffect(() => {
    if (data.date && venueId) {
      loadSlotsForDate(data.date, venueId);
      if (isCombined) {
        loadCurlingData(data.date, venueId);
      }
    } else {
      setSlotsForDate([]);
      setLaneData([]);
    }
  }, [data.date, venueId, loadSlotsForDate, loadCurlingData, isCombined]);

  // ──────────────────── Kalender-Logik ───────────────────────

  const selectedDate = data.date ? new Date(data.date + "T00:00:00") : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDateInfo = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return monthData?.dates[dateKey] || null;
  };

  const isDateSelectable = (date: Date) => {
    if (isBefore(date, today)) return false;
    if (isBefore(date, SEASON_START) || isAfter(date, SEASON_END)) return false;
    const info = getDateInfo(date);
    if (!info) return false;
    return info.available;
  };

  const isInSeason = (date: Date) => {
    return !isBefore(date, SEASON_START) && !isAfter(date, SEASON_END);
  };

  const handleSelectDate = (date: Date) => {
    if (!isDateSelectable(date)) return;
    const dateStr = format(date, "yyyy-MM-dd");
    updateData({ date: dateStr, timeSlotId: "", timeSlotLabel: "", curlingSlots: [] });
    setTimeout(() => {
      slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    if (!isBefore(startOfMonth(prev), new Date(2026, 9, 1))) {
      setCurrentMonth(prev);
    }
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    if (!isAfter(startOfMonth(next), new Date(2027, 1, 1))) {
      setCurrentMonth(next);
    }
  };

  // ──────────────────── Slot-Filterung ───────────────────────
  const selectedDateObj = data.date ? new Date(data.date + "T00:00:00") : null;
  const isoDay = selectedDateObj ? getISODay(selectedDateObj) : 1;
  const minStartHour = getMinStartHour(isoDay);
  const maxStartHour = getMaxStartHour(isoDay);
  const closingHour = getVenueClosingHour(isoDay);

  const filteredSlots = useMemo(() => {
    return slotsForDate.filter((slot) => {
      const hour = parseInt(slot.startTime.split(":")[0], 10);
      return hour >= minStartHour && hour <= maxStartHour;
    });
  }, [slotsForDate, minStartHour, maxStartHour]);

  const selectedDateInfo = selectedDate ? getDateInfo(selectedDate) : null;
  const dailyAvailableTables = selectedDateInfo?.availableTables ?? 0;
  const hasCapacityForGroup = dailyAvailableTables >= requiredTables;

  const handleSelectSlot = (slot: TimeSlotFromDB) => {
    if (!hasCapacityForGroup) return;
    const startHour = parseInt(slot.startTime.split(":")[0], 10);
    const duration = getSlotDuration(startHour, isoDay);
    const endHour = startHour + duration;
    const isLate = startHour === 19 && isoDay !== 7;
    const label = `${slot.startTime} – ${endHour}:00 Uhr (${duration}h)${isLate ? "*" : ""}`;
    updateData({ timeSlotId: slot.id, timeSlotLabel: label });
  };

  // ──────────────────── Curling Slot Selection (COMBINED) ────
  const isSlotSelected = (laneId: string, startTime: string) => {
    return selectedCurlingSlots.some(
      (s) => s.laneId === laneId && s.startTime === startTime
    );
  };

  const getPrimaryLaneId = () => {
    if (!selectedCurlingSlots.length) return null;
    return selectedCurlingSlots[0].laneId;
  };

  const isWithinPrimaryWindow = (laneId: string, startTime: string) => {
    if (!selectedCurlingSlots.length) return true;
    const primaryLaneId = getPrimaryLaneId();
    if (!primaryLaneId || laneId === primaryLaneId) return true;

    const primarySlots = selectedCurlingSlots.filter(
      (s) => s.laneId === primaryLaneId
    );
    if (!primarySlots.length) return true;

    const primaryStartHours = primarySlots.map((s) =>
      parseInt(s.startTime.split(":")[0], 10)
    );
    const primaryEndHours = primarySlots.map((s) =>
      parseInt(s.endTime.split(":")[0], 10)
    );
    const windowStart = Math.min(...primaryStartHours);
    const windowEnd = Math.max(...primaryEndHours);
    const hour = parseInt(startTime.split(":")[0], 10);

    // Zweite Bahn darf nur innerhalb des Zeitfensters der ersten Bahn liegen
    return hour >= windowStart && hour < windowEnd;
  };

  const countSlotsForLane = (laneId: string) => {
    return selectedCurlingSlots.filter((s) => s.laneId === laneId).length;
  };

  const canSelectSlot = (laneId: string, startTime: string) => {
    if (selectedCurlingSlots.length >= MAX_CURLING_TOTAL_SLOTS) return false;
    if (countSlotsForLane(laneId) >= MAX_CURLING_HOURS_PER_LANE) return false;
    if (!isWithinPrimaryWindow(laneId, startTime)) return false;
    return true;
  };

  const toggleCurlingSlot = (
    laneId: string,
    laneName: string,
    startTime: string,
    endTime: string,
    price: number
  ) => {
    const selected = isSlotSelected(laneId, startTime);
    if (selected) {
      updateData({
        curlingSlots: selectedCurlingSlots.filter(
          (s) => !(s.laneId === laneId && s.startTime === startTime)
        ),
      });
    } else {
      if (!canSelectSlot(laneId, startTime)) return;
      const newSlot: CurlingSlotSelection = {
        laneId,
        laneName,
        date: data.date || "",
        startTime,
        endTime,
        price,
      };
      updateData({
        curlingSlots: [...selectedCurlingSlots, newSlot],
      });
    }
  };

  const curlingTotal = selectedCurlingSlots.reduce((sum, s) => sum + s.price, 0);

  // ──────────────────── Navigation ───────────────────────────
  const canContinue = !!data.date && !!data.timeSlotId;

  const canGoPrev = !isBefore(
    startOfMonth(subMonths(currentMonth, 1)),
    new Date(2026, 9, 1)
  );
  const canGoNext = !isAfter(
    startOfMonth(addMonths(currentMonth, 1)),
    new Date(2027, 1, 1)
  );

  const dateFormatted = selectedDate
    ? format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })
    : "";

  const showSundayNote = isoDay !== 7;

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <CalendarDays className="h-5 w-5 text-coral" />
          {isCombined ? "Datum, Uhrzeit & Eisstockbahnen" : "Datum & Uhrzeit wählen"}
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          {isCombined
            ? "Wählen Sie Tag, Uhrzeit und optional Eisstockbahnen für Ihre Feier."
            : `Wählen Sie Tag und Uhrzeit für Ihre Weihnachtsfeier mit `}
          {!isCombined && (
            <span className="font-semibold text-coral">
              {personCount} Personen
            </span>
          )}
          {isCombined && (
            <span className="font-semibold text-coral">
              {personCount} Personen
            </span>
          )}
        </p>
        <p className="text-xs text-landhaus-brown-light/50">
          Saison: 1. November 2026 – 31. Januar 2027 · Öffnungszeiten: Mo–Fr 16–22, Sa 14–22, So 12–20 Uhr
        </p>
      </CardHeader>
      <CardContent>
        {/* ═══ KALENDER ═══════════════════════════════════════════ */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className="hover:bg-landhaus-cream"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-serif text-lg font-semibold text-landhaus-brown">
            {format(currentMonth, "MMMM yyyy", { locale: de })}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className="hover:bg-landhaus-cream"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Wochentage */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-landhaus-brown-light/60"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Kalender-Tage */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date) => {
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const selectable = isDateSelectable(date) && isCurrentMonth;
            const inSeason = isInSeason(date) && isCurrentMonth;
            const dateInfo = getDateInfo(date);
            const isBooked =
              inSeason &&
              dateInfo &&
              !dateInfo.available &&
              !isBefore(date, today);

            return (
              <div key={date.toISOString()} className="relative">
                <button
                  disabled={!selectable}
                  onClick={() => handleSelectDate(date)}
                  title={
                    isBooked
                      ? "Ausgebucht für diese Personenzahl"
                      : undefined
                  }
                  className={cn(
                    "relative h-10 w-full rounded-lg text-sm transition-colors sm:h-12",
                    !isCurrentMonth && "invisible",
                    selectable
                      ? "cursor-pointer hover:bg-coral/10"
                      : "cursor-default text-gray-300",
                    isBooked &&
                      "cursor-not-allowed bg-red-50 text-red-300 line-through",
                    isSelected &&
                      "bg-coral font-bold text-white hover:bg-coral-light",
                    isToday && !isSelected && "font-bold text-coral"
                  )}
                >
                  {format(date, "d")}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-coral" />
                  )}
                </button>
                {isBooked && isCurrentMonth && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                    <span className="block h-1 w-1 rounded-full bg-red-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading-Indikator */}
        {loading && (
          <div className="mt-2 text-center text-xs text-landhaus-brown-light/50">
            Verfügbarkeit wird geprüft...
          </div>
        )}

        {/* Legende */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-landhaus-brown-light/60">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-coral" />
            Verfügbar
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-red-50 ring-1 ring-red-200" />
            Ausgebucht
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-gray-100" />
            Nicht verfügbar
          </div>
        </div>

        {/* Hinweis bei ausgebuchten Tagen */}
        {monthData &&
          Object.values(monthData.dates).some(
            (d) =>
              !d.available &&
              d.reason === "Ausgebucht für diese Personenzahl"
          ) && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Einige Tage sind für {personCount} Personen nicht mehr
                verfügbar. Rot markierte Tage sind ausgebucht.
              </span>
            </div>
          )}

        {/* ═══ UHRZEIT-AUSWAHL ════════════════════════════════════ */}
        {data.date && selectedDate && (
          <div
            ref={slotsRef}
            className="mt-6 border-t border-landhaus-cream-dark pt-6"
          >
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-landhaus-brown">
                  <Clock className="h-5 w-5 text-coral" />
                  Uhrzeit wählen
                </h3>
                <p className="mt-0.5 text-sm text-landhaus-brown-light/70">
                  {dateFormatted}
                </p>
              </div>
            </div>

            {/* Slots laden... */}
            {slotsLoading ? (
              <div className="py-8 text-center text-sm text-landhaus-brown-light/50">
                Zeitfenster werden geladen...
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50/80 p-4 text-sm text-amber-900 ring-1 ring-amber-200/50">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Für diesen Tag sind keine Zeitfenster verfügbar.
                </span>
              </div>
            ) : (
              <>
                {/* Kapazitätswarnung */}
                {!hasCapacityForGroup && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200/50">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Für {personCount} Personen ist an diesem Tag leider
                      nicht mehr genügend Platz verfügbar. Bitte wählen Sie
                      ein anderes Datum.
                    </span>
                  </div>
                )}

                {/* Slot-Buttons */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredSlots.map((slot) => {
                    const startHour = parseInt(
                      slot.startTime.split(":")[0],
                      10
                    );
                    const duration = getSlotDuration(startHour, isoDay);
                    const endHour = startHour + duration;
                    const isLate = startHour === 19 && isoDay !== 7;
                    const isSelected = data.timeSlotId === slot.id;
                    const isDisabled = !hasCapacityForGroup;

                    return (
                      <button
                        key={slot.id}
                        onClick={() => handleSelectSlot(slot)}
                        disabled={isDisabled}
                        className={cn(
                          "flex items-center justify-between rounded-xl border-2 p-3 text-left transition-all sm:p-4",
                          isDisabled &&
                            "cursor-not-allowed opacity-50",
                          isSelected
                            ? "border-coral bg-coral/5 ring-2 ring-coral/20"
                            : !isDisabled
                              ? "border-landhaus-cream-dark hover:border-coral/40 hover:bg-landhaus-cream"
                              : "border-gray-200 bg-gray-50"
                        )}
                      >
                        <div>
                          <p className="text-base font-semibold text-landhaus-brown sm:text-lg">
                            {slot.startTime} Uhr
                            {isLate && (
                              <span className="text-landhaus-burgundy">*</span>
                            )}
                            <span className="ml-2 text-xs font-normal text-landhaus-brown-light/60 sm:text-sm">
                              bis {endHour}:00 Uhr
                            </span>
                          </p>
                          <p className="text-xs text-landhaus-brown-light/60">
                            {duration}h Reservierung
                            {isLate && (
                              <span className="ml-1 text-landhaus-burgundy">
                                (verkürzt)*
                              </span>
                            )}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isSelected
                              ? "border-coral bg-coral"
                              : "border-gray-300"
                          )}
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Hinweis je nach Wochentag */}
                {showSundayNote ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50/80 p-3 text-xs text-amber-900 ring-1 ring-amber-200/50">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      <strong className="text-landhaus-burgundy">*</strong> Der
                      19:00 Uhr Zeitslot gilt nur für{" "}
                      <strong>3 Stunden</strong>, da der StadtParkZauber um
                      22:00 Uhr schließt. Für alle anderen Zeitfenster gilt
                      eine Reservierungsdauer von{" "}
                      <strong>4 Stunden</strong>.
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50/80 p-3 text-xs text-amber-900 ring-1 ring-amber-200/50">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      Sonntags schließt der StadtParkZauber um <strong>20:00 Uhr</strong>.
                      Alle Zeitfenster umfassen <strong>4 Stunden</strong>.
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ═══ EISSTOCKBAHNEN (nur bei COMBINED) ══════════════ */}
            {isCombined && data.timeSlotId && (
              <div className="mt-6 border-t border-landhaus-cream-dark pt-6">
                <h3 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-landhaus-brown">
                  <Snowflake className="h-5 w-5 text-coral" />
                  Eisstockschießen (optional)
                </h3>
                <p className="mb-4 text-sm text-landhaus-brown-light/70">
                  Optional: Buchen Sie zusätzlich eine Eisstockbahn. Max. 2 Bahnen à 2 Stunden.
                </p>

                {curlingLoading ? (
                  <div className="py-4 text-center text-sm text-landhaus-brown-light/50">
                    Bahnen werden geladen...
                  </div>
                ) : laneData.length === 0 ? (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50/80 p-4 text-sm text-amber-900">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Keine Bahnen für diesen Tag verfügbar.</span>
                  </div>
                ) : (
                  <>
                    {/* Preisinfo */}
                    <div className="mb-3 rounded-lg bg-landhaus-cream p-3">
                      <p className="text-xs font-semibold text-landhaus-brown">
                        Preise pro Bahn / Stunde:
                      </p>
                      <p className="mt-1 text-xs text-landhaus-brown-light/70">
                        Alle Preise inkl. der gesetzlichen MwSt.
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-landhaus-brown-light/70">
                        <span>Mo–Fr: 16–18 Uhr = 39 € · 18–22 Uhr = 69 €</span>
                        <span>Sa: 14–18 Uhr = 69 € · 18–22 Uhr = 89 €</span>
                        <span>So: 12–20 Uhr = 39 €</span>
                      </div>
                    </div>

                    {/* Bahnen-Grid */}
                    <div className="space-y-4">
                      {laneData.map((lane) => (
                        <div
                          key={lane.laneId}
                          className="rounded-xl border border-landhaus-cream-dark p-4"
                        >
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-landhaus-brown">
                            <Snowflake className="h-4 w-4 text-coral" />
                            {lane.laneName}
                            {countSlotsForLane(lane.laneId) > 0 && (
                              <span className="ml-auto rounded-full bg-coral/10 px-2 py-0.5 text-xs text-coral">
                                {countSlotsForLane(lane.laneId)}h ausgewählt
                              </span>
                            )}
                          </h4>

                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                            {lane.slots.map((slot) => {
                              const selected = isSlotSelected(
                                lane.laneId,
                                slot.startTime
                              );
                              const canSelect =
                                slot.available &&
                                (selected ||
                                  canSelectSlot(lane.laneId, slot.startTime));

                              return (
                                <button
                                  key={slot.startTime}
                                  disabled={!canSelect && !selected}
                                  onClick={() =>
                                    toggleCurlingSlot(
                                      lane.laneId,
                                      lane.laneName,
                                      slot.startTime,
                                      slot.endTime,
                                      slot.price
                                    )
                                  }
                                  className={cn(
                                    "relative flex flex-col items-center rounded-lg border-2 px-2 py-2 text-xs transition-all",
                                    selected
                                      ? "border-coral bg-coral text-white"
                                      : slot.available && canSelect
                                        ? "border-landhaus-cream-dark hover:border-coral hover:bg-coral/5"
                                        : slot.available
                                          ? "border-gray-200 opacity-50"
                                          : "border-gray-200 bg-gray-50 text-gray-300 line-through"
                                  )}
                                >
                                  <span className="font-semibold">
                                    {slot.startTime}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px]",
                                      selected
                                        ? "text-white/80"
                                        : "text-landhaus-brown-light/50"
                                    )}
                                  >
                                    {formatMoney(slot.price)}
                                  </span>
                                  {selected && (
                                    <Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white text-coral" />
                                  )}
                                  {!slot.available && (
                                    <span className="text-[10px] text-gray-400">
                                      belegt
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Curling Zusammenfassung */}
                    {selectedCurlingSlots.length > 0 && (
                      <div className="mt-4 rounded-lg bg-coral/5 p-4 ring-1 ring-coral/20">
                        <p className="text-sm font-semibold text-landhaus-brown">
                          Eisstockschießen:
                        </p>
                        <div className="mt-2 space-y-1">
                          {selectedCurlingSlots.map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-landhaus-brown-light/70">
                                {s.laneName}: {s.startTime} – {s.endTime} Uhr
                              </span>
                              <span className="font-semibold text-coral">
                                {formatMoney(s.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-coral/20 pt-2">
                          <span className="text-sm font-semibold text-landhaus-brown">
                            Gesamt Eisstock:
                          </span>
                          <span className="font-serif text-base font-bold text-coral">
                            {formatMoney(curlingTotal)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ NAVIGATION ═════════════════════════════════════════ */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => prevStep()}
            className="border-landhaus-cream-dark hover:bg-landhaus-cream"
          >
            Zurück
          </Button>
          <Button
            size="lg"
            disabled={!canContinue}
            onClick={() => nextStep()}
            className="bg-coral hover:bg-coral-light"
          >
            Weiter zu Extras
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
