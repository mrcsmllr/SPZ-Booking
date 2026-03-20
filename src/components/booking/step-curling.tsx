"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useBookingStore, getCurlingHours } from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Snowflake,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
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
} from "date-fns";
import { de } from "date-fns/locale";
import type { CurlingSlotSelection, CurlingLaneAvailability } from "@/types/booking";

const SEASON_START = new Date(2026, 10, 1);
const SEASON_END = new Date(2027, 0, 31);

const MAX_HOURS_PER_LANE = 2;
const MAX_TOTAL_SLOTS = 4; // 2 Bahnen × 2 Stunden

export function StepCurling() {
  const { data, updateData, nextStep, prevStep } = useBookingStore();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 10, 1));
  const [laneData, setLaneData] = useState<CurlingLaneAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [venueId, setVenueId] = useState<string>("");

  const selectedDate = data.date ? new Date(data.date + "T00:00:00") : null;
  const selectedSlots = data.curlingSlots || [];

  // ── VenueId beim Start laden ────────────────────────────────
  useEffect(() => {
    if (!venueId) {
      fetch("/api/public/availability/month?month=2026-11&personCount=10")
        .then((r) => r.json())
        .then((d) => {
          if (d.venueId) {
            setVenueId(d.venueId);
            updateData({ venueId: d.venueId });
          }
        })
        .catch(() => {});
    }
  }, [venueId, updateData]);

  // ── Curling-Verfügbarkeit laden ─────────────────────────────
  const loadCurlingData = useCallback(
    async (dateStr: string) => {
      if (!venueId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `/api/public/curling/availability?date=${dateStr}&venueId=${venueId}`
        );
        const result = await response.json();
        setLaneData(result.lanes || []);
      } catch {
        setLaneData([]);
      } finally {
        setLoading(false);
      }
    },
    [venueId]
  );

  useEffect(() => {
    if (data.date && venueId) {
      loadCurlingData(data.date);
    }
  }, [data.date, venueId, loadCurlingData]);

  // ── Kalender-Logik ──────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const isDateSelectable = (date: Date) => {
    if (isBefore(date, today)) return false;
    if (isBefore(date, SEASON_START) || isAfter(date, SEASON_END)) return false;
    // Prüfe ob es Öffnungszeiten gibt
    const dow = date.getDay();
    return getCurlingHours(dow) !== null;
  };

  const isInSeason = (date: Date) => {
    return !isBefore(date, SEASON_START) && !isAfter(date, SEASON_END);
  };

  const handleSelectDate = (date: Date) => {
    if (!isDateSelectable(date)) return;
    const dateStr = format(date, "yyyy-MM-dd");
    updateData({ date: dateStr, curlingSlots: [] });
  };

  const canGoPrev = !isBefore(
    startOfMonth(subMonths(currentMonth, 1)),
    new Date(2026, 9, 1)
  );
  const canGoNext = !isAfter(
    startOfMonth(addMonths(currentMonth, 1)),
    new Date(2027, 1, 1)
  );

  // ── Slot-Selection ──────────────────────────────────────────
  const isSlotSelected = (laneId: string, startTime: string) => {
    return selectedSlots.some(
      (s) => s.laneId === laneId && s.startTime === startTime
    );
  };

  const getPrimaryLaneId = () => {
    if (!selectedSlots.length) return null;
    return selectedSlots[0].laneId;
  };

  const isWithinPrimaryWindow = (laneId: string, startTime: string) => {
    if (!selectedSlots.length) return true;
    const primaryLaneId = getPrimaryLaneId();
    if (!primaryLaneId || laneId === primaryLaneId) return true;

    const primarySlots = selectedSlots.filter((s) => s.laneId === primaryLaneId);
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
    return selectedSlots.filter((s) => s.laneId === laneId).length;
  };

  const toggleSlot = (
    laneId: string,
    laneName: string,
    startTime: string,
    endTime: string,
    price: number
  ) => {
    const isSelected = isSlotSelected(laneId, startTime);

    if (isSelected) {
      // Deselect
      updateData({
        curlingSlots: selectedSlots.filter(
          (s) => !(s.laneId === laneId && s.startTime === startTime)
        ),
      });
    } else {
      // Select – Validierung
      if (selectedSlots.length >= MAX_TOTAL_SLOTS) return;
      if (countSlotsForLane(laneId) >= MAX_HOURS_PER_LANE) return;
      if (!isWithinPrimaryWindow(laneId, startTime)) return;

      const newSlot: CurlingSlotSelection = {
        laneId,
        laneName,
        date: data.date || "",
        startTime,
        endTime,
        price,
      };
      updateData({
        curlingSlots: [...selectedSlots, newSlot],
      });
    }
  };

  const canSelectSlot = (laneId: string, startTime: string) => {
    if (selectedSlots.length >= MAX_TOTAL_SLOTS) return false;
    if (countSlotsForLane(laneId) >= MAX_HOURS_PER_LANE) return false;
    if (!isWithinPrimaryWindow(laneId, startTime)) return false;
    return true;
  };

  // Gesamtpreis der ausgewählten Slots
  const curlingTotal = selectedSlots.reduce((sum, s) => sum + s.price, 0);
  const canContinue = selectedSlots.length > 0;

  const dateFormatted = selectedDate
    ? format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })
    : "";

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <Snowflake className="h-5 w-5 text-coral" />
          Eisstockschießen buchen
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Wählen Sie einen Tag und die gewünschten Bahnen & Zeiten.
        </p>
        <p className="text-xs text-landhaus-brown-light/50">
          Saison: 1. November 2026 – 31. Januar 2027 · Max. 2 Bahnen à 2 Stunden
        </p>
      </CardHeader>
      <CardContent>
        {/* ═══ KALENDER ════════════════════════════════════════════ */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setCurrentMonth((prev) => {
                const p = subMonths(prev, 1);
                return !isBefore(startOfMonth(p), new Date(2026, 9, 1))
                  ? p
                  : prev;
              })
            }
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
            onClick={() =>
              setCurrentMonth((prev) => {
                const n = addMonths(prev, 1);
                return !isAfter(startOfMonth(n), new Date(2027, 1, 1))
                  ? n
                  : prev;
              })
            }
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

        {/* Tage */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date) => {
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const selectable = isDateSelectable(date) && isCurrentMonth;
            const inSeason = isInSeason(date) && isCurrentMonth;

            return (
              <div key={date.toISOString()} className="relative">
                <button
                  disabled={!selectable}
                  onClick={() => handleSelectDate(date)}
                  className={cn(
                    "relative h-10 w-full rounded-lg text-sm transition-colors sm:h-12",
                    !isCurrentMonth && "invisible",
                    selectable
                      ? "cursor-pointer hover:bg-coral/10"
                      : "cursor-default text-gray-300",
                    !inSeason &&
                      isCurrentMonth &&
                      "text-gray-300",
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
              </div>
            );
          })}
        </div>

        {/* ═══ BAHNEN-AUSWAHL ══════════════════════════════════════ */}
        {data.date && selectedDate && (
          <div className="mt-6 border-t border-landhaus-cream-dark pt-6">
            <h3 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-landhaus-brown">
              <CalendarDays className="h-5 w-5 text-coral" />
              Bahnbelegung – {dateFormatted}
            </h3>
            <p className="mb-4 text-sm text-landhaus-brown-light/70">
              Klicken Sie auf freie Slots, um diese auszuwählen. Max. 2 Stunden pro Bahn.
            </p>

            {loading ? (
              <div className="py-8 text-center text-sm text-landhaus-brown-light/50">
                Verfügbarkeit wird geladen...
              </div>
            ) : laneData.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50/80 p-4 text-sm text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>An diesem Tag sind keine Bahnen verfügbar.</span>
              </div>
            ) : (
              <>
                {/* Preisinfo */}
                <div className="mb-4 rounded-lg bg-landhaus-cream p-3">
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
                    <div key={lane.laneId} className="rounded-xl border border-landhaus-cream-dark p-4">
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
                                toggleSlot(
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

                {/* Legende */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-landhaus-brown-light/60">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded border-2 border-coral bg-coral" />
                    Ausgewählt
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded border-2 border-landhaus-cream-dark" />
                    Verfügbar
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded border-2 border-gray-200 bg-gray-50" />
                    Belegt
                  </div>
                </div>

                {/* Ausgewählte Slots Zusammenfassung */}
                {selectedSlots.length > 0 && (
                  <div className="mt-4 rounded-lg bg-coral/5 p-4 ring-1 ring-coral/20">
                    <p className="text-sm font-semibold text-landhaus-brown">
                      Ihre Auswahl:
                    </p>
                    <div className="mt-2 space-y-1">
                      {selectedSlots.map((s, i) => (
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
                      <span className="font-semibold text-landhaus-brown">
                        Gesamt Eisstockschießen:
                      </span>
                      <span className="font-serif text-lg font-bold text-coral">
                        {formatMoney(curlingTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ NAVIGATION ══════════════════════════════════════════ */}
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
            Weiter zu Kontaktdaten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
