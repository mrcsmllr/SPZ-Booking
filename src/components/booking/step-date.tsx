"use client";

import { useState, useEffect, useCallback } from "react";
import { useBookingStore } from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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

// Saison: 01.11.2026 – 31.01.2027
const SEASON_START = new Date(2026, 10, 1); // November 2026
const SEASON_END = new Date(2027, 0, 31);   // Januar 2027

interface MonthAvailability {
  dates: Record<string, { available: boolean; availableSeats: number; reason?: string }>;
  totalSeats: number;
}

export function StepDate() {
  const { data, updateData, nextStep, prevStep } = useBookingStore();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 10, 1)); // Start im November 2026
  const [monthData, setMonthData] = useState<MonthAvailability | null>(null);
  const [loading, setLoading] = useState(false);

  const personCount = data.personCount || 10;

  // Monatsdaten laden
  const loadMonthData = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const monthStr = format(month, "yyyy-MM");
      const response = await fetch(
        `/api/public/availability/month?month=${monthStr}&personCount=${personCount}`
      );
      const data = await response.json();
      setMonthData(data);
    } catch {
      setMonthData(null);
    } finally {
      setLoading(false);
    }
  }, [personCount]);

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth, loadMonthData]);

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
    updateData({ date: dateStr, timeSlotId: "", timeSlotLabel: "" }); // Reset time slot
  };

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    // Nicht vor die Saison navigieren
    if (!isBefore(startOfMonth(prev), new Date(2026, 9, 1))) {
      setCurrentMonth(prev);
    }
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    // Nicht nach der Saison navigieren
    if (!isAfter(startOfMonth(next), new Date(2027, 1, 1))) {
      setCurrentMonth(next);
    }
  };

  const canContinue = !!data.date;

  // Prüfe ob Prev/Next erlaubt
  const canGoPrev = !isBefore(startOfMonth(subMonths(currentMonth, 1)), new Date(2026, 9, 1));
  const canGoNext = !isAfter(startOfMonth(addMonths(currentMonth, 1)), new Date(2027, 1, 1));

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <CalendarDays className="h-5 w-5 text-coral" />
          Datum wählen
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Wählen Sie den gewünschten Tag für Ihre Weihnachtsfeier mit{" "}
          <span className="font-semibold text-coral">{personCount} Personen</span>.
        </p>
        <p className="text-xs text-landhaus-brown-light/50">
          Saison: 1. November 2026 – 31. Januar 2027
        </p>
      </CardHeader>
      <CardContent>
        {/* Kalender-Navigation */}
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
            const isBooked = inSeason && dateInfo && !dateInfo.available && !isBefore(date, today);

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
                {/* Ausgebucht-Indikator */}
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

        {/* Ausgewähltes Datum */}
        {selectedDate && (
          <div className="mt-4 rounded-lg bg-coral/5 p-3 text-center ring-1 ring-coral/20">
            <p className="text-sm font-medium text-coral">
              {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
          </div>
        )}

        {/* Hinweis bei ausgebuchten Tagen */}
        {monthData && Object.values(monthData.dates).some((d) => !d.available && d.reason === "Ausgebucht für diese Personenzahl") && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Einige Tage sind für {personCount} Personen nicht mehr verfügbar.
              Rot markierte Tage haben nicht genügend freie Plätze.
            </span>
          </div>
        )}

        {/* Navigation */}
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
            Weiter zur Uhrzeit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
