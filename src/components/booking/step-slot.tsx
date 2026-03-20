"use client";

import { useMemo } from "react";
import { useBookingStore } from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getISODay, parseISO, format } from "date-fns";
import { de } from "date-fns/locale";

// Zeitfenster-Definition basierend auf Wochentag
interface TimeSlotOption {
  id: string;
  startTime: string;
  duration: number; // Stunden
  hasAsterisk: boolean;
}

function getTimeSlotsForWeekday(isoDay: number): TimeSlotOption[] {
  const slots: TimeSlotOption[] = [];

  // Startzeiten basierend auf Wochentag
  let startHour: number;
  if (isoDay >= 1 && isoDay <= 5) {
    // Mo-Fr: 16-19 Uhr
    startHour = 16;
  } else if (isoDay === 6) {
    // Sa: 14-19 Uhr
    startHour = 14;
  } else {
    // So: 12-19 Uhr
    startHour = 12;
  }

  for (let hour = startHour; hour <= 19; hour++) {
    const isLateSlot = hour === 19;
    const duration = isLateSlot ? 3 : 4; // 19 Uhr = 3h (bis 22 Uhr), sonst 4h

    slots.push({
      id: `slot-${hour}`,
      startTime: `${hour}:00`,
      duration,
      hasAsterisk: isLateSlot,
    });
  }

  return slots;
}

function getWeekdayLabel(isoDay: number): string {
  switch (isoDay) {
    case 1: return "Montag";
    case 2: return "Dienstag";
    case 3: return "Mittwoch";
    case 4: return "Donnerstag";
    case 5: return "Freitag";
    case 6: return "Samstag";
    case 7: return "Sonntag";
    default: return "";
  }
}

export function StepSlot() {
  const { data, updateData, nextStep, prevStep } = useBookingStore();

  const selectedDate = data.date ? parseISO(data.date) : null;
  const isoDay = selectedDate ? getISODay(selectedDate) : 1;

  const slots = useMemo(() => getTimeSlotsForWeekday(isoDay), [isoDay]);

  const handleSelectSlot = (slot: TimeSlotOption) => {
    const endHour = parseInt(slot.startTime) + slot.duration;
    const endTime = `${endHour}:00`;
    const label = `${slot.startTime} – ${endTime} Uhr (${slot.duration}h)`;
    updateData({ timeSlotId: slot.id, timeSlotLabel: label });
  };

  const canContinue = !!data.timeSlotId;

  const dateFormatted = selectedDate
    ? format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })
    : "";

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <Clock className="h-5 w-5 text-coral" />
          Zeitfenster wählen
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Wählen Sie die gewünschte Startzeit für Ihre Feier am{" "}
          <span className="font-semibold text-coral">{dateFormatted}</span>.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {slots.map((slot) => {
            const endHour = parseInt(slot.startTime) + slot.duration;
            const isSelected = data.timeSlotId === slot.id;

            return (
              <button
                key={slot.id}
                onClick={() => handleSelectSlot(slot)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all",
                  isSelected
                    ? "border-coral bg-coral/5 ring-2 ring-coral/20"
                    : "border-landhaus-cream-dark hover:border-coral/40 hover:bg-landhaus-cream"
                )}
              >
                <div>
                  <p className="text-lg font-semibold text-landhaus-brown">
                    {slot.startTime} Uhr{slot.hasAsterisk && <span className="text-landhaus-burgundy">*</span>}
                    <span className="ml-2 text-sm font-normal text-landhaus-brown-light/60">
                      bis {endHour}:00 Uhr
                    </span>
                  </p>
                  <p className="text-sm text-landhaus-brown-light/60">
                    {slot.duration} Stunden Reservierung
                    {slot.hasAsterisk && (
                      <span className="ml-1 text-landhaus-burgundy">(verkürzt)*</span>
                    )}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
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

        {/* Sternchen-Hinweis */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50/80 p-3 text-xs text-amber-900 ring-1 ring-amber-200/50">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            <strong className="text-landhaus-burgundy">*</strong> Der 19:00 Uhr Zeitslot gilt nur für{" "}
            <strong>3 Stunden</strong>, da der StadtParkZauber um 22:00 Uhr schließt.
            Für alle anderen Zeitfenster gilt eine Reservierungsdauer von <strong>4 Stunden</strong>.
          </span>
        </div>

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
            Weiter zu Extras
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
