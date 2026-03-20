"use client";

import { useBookingStore } from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreePine, Users, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { BookingType } from "@/types/booking";

const BOOKING_OPTIONS: {
  type: BookingType;
  title: string;
  description: string;
  icon: typeof Users;
  details: string[];
}[] = [
  {
    type: "TABLE_ONLY",
    title: "Tischreservierung",
    description: "Reservieren Sie Tische für Ihre Weihnachtsfeier im StadtParkZauber.",
    icon: Users,
    details: [
      "10–50 Personen",
      "69 € pro Person",
      "4h Reservierung",
      "Optionale Extras buchbar",
    ],
  },
  {
    type: "CURLING_ONLY",
    title: "Eisstockschießen",
    description: "Mieten Sie eine unserer zwei Eisstockschießbahnen – auch ohne Tischreservierung.",
    icon: Snowflake,
    details: [
      "2 Bahnen verfügbar",
      "1h-Slots buchbar (max. 2h)",
      "Ab 39 € pro Bahn/Stunde",
      "Flexible Zeitwahl",
    ],
  },
  {
    type: "COMBINED",
    title: "Tischreservierung + Eisstockschießen",
    description: "Kombinieren Sie Ihre Weihnachtsfeier mit Eisstockschießen – alles in einer Buchung.",
    icon: TreePine,
    details: [
      "Tische + Eisstockbahnen",
      "Alles auf einen Blick",
      "Kombinierte Verfügbarkeit",
      "Ein Buchungsvorgang",
    ],
  },
];

export function StepBookingType() {
  const { setBookingType } = useBookingStore();

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-serif text-landhaus-brown">
          <TreePine className="h-5 w-5 text-coral" />
          Was möchten Sie buchen?
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Wählen Sie die Art Ihrer Buchung für den StadtParkZauber.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {BOOKING_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => setBookingType(option.type)}
              className={cn(
                "group flex flex-col rounded-2xl border-2 p-5 text-left transition-all",
                "border-landhaus-cream-dark hover:border-coral hover:bg-coral/5 hover:shadow-lg"
              )}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral transition-colors group-hover:bg-coral group-hover:text-white">
                <option.icon className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-landhaus-brown">
                {option.title}
              </h3>
              <p className="mt-1 text-sm text-landhaus-brown-light/70">
                {option.description}
              </p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {option.details.map((detail, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-xs text-landhaus-brown-light/60"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-coral" />
                    {detail}
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg bg-coral/10 px-4 py-2 text-center text-sm font-semibold text-coral transition-colors group-hover:bg-coral group-hover:text-white">
                Auswählen
              </div>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-landhaus-brown-light/40">
          Alle Preise inkl. der gesetzlichen MwSt.
        </p>
      </CardContent>
    </Card>
  );
}
