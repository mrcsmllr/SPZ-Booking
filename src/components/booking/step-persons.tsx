"use client";

import { useBookingStore, MAX_PERSONS, MIN_PERSONS, PRICE_PER_PERSON, getTableCount } from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Minus, Plus, Mail, Info } from "lucide-react";
import { formatMoney } from "@/lib/utils/date";

export function StepPersons() {
  const { data, updateData, nextStep } = useBookingStore();
  const personCount = data.personCount || 0;

  const handleChange = (delta: number) => {
    const newValue = Math.max(
      MIN_PERSONS,
      Math.min(MAX_PERSONS, personCount + delta)
    );
    updateData({ personCount: newValue });
  };

  const handleInputChange = (value: string) => {
    // Leeres Feld erlauben
    if (value === "") {
      updateData({ personCount: 0 });
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      updateData({
        personCount: Math.min(MAX_PERSONS, Math.max(0, num)),
      });
    }
  };

  const tables = getTableCount(personCount);
  const total = personCount * PRICE_PER_PERSON;
  const canContinue = personCount >= MIN_PERSONS && personCount <= MAX_PERSONS;

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <Users className="h-5 w-5 text-coral" />
          Wie viele Gäste erwarten Sie?
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Tragen Sie die gewünschte Personenanzahl ein. (Min. {MIN_PERSONS}, Max. 50 Personen)
        </p>
      </CardHeader>
      <CardContent>
        {/* Personen-Eingabe */}
        <div className="flex items-center justify-center gap-6 py-8">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-coral/30 hover:border-coral hover:bg-coral/10"
            disabled={personCount <= MIN_PERSONS}
            onClick={() => handleChange(-1)}
          >
            <Minus className="h-5 w-5" />
          </Button>

          <div className="text-center">
            <input
              type="number"
              min={MIN_PERSONS}
              max={MAX_PERSONS}
              value={personCount === 0 ? "" : personCount}
              placeholder="0"
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-28 border-b-2 border-coral bg-transparent text-center font-serif text-5xl font-bold text-landhaus-brown outline-none placeholder:text-landhaus-brown/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <p className="mt-1 text-sm text-landhaus-brown-light/60">Personen</p>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-coral/30 hover:border-coral hover:bg-coral/10"
            disabled={personCount >= MAX_PERSONS}
            onClick={() => handleChange(1)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Tisch- und Preis-Info */}
        {personCount > 0 && (
          <div className="space-y-2 rounded-lg bg-landhaus-cream p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-landhaus-brown-light/70">Reservierte Tische:</span>
              <span className="font-semibold text-landhaus-brown">
                {tables} {tables === 1 ? "Tisch" : "Tische"} (je max. 12 Plätze)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-landhaus-brown-light/70">Preis pro Person:</span>
              <span className="font-semibold text-landhaus-brown">{formatMoney(PRICE_PER_PERSON)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-landhaus-cream-dark pt-2">
              <span className="font-medium text-landhaus-brown">Gesamtbetrag:</span>
              <span className="font-serif text-lg font-bold text-coral">{formatMoney(total)}</span>
            </div>
          </div>
        )}

        {/* Hinweis für größere Gruppen */}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50/80 p-4 ring-1 ring-amber-200/50">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Gruppenbuchung für größere Gruppen</p>
            <p className="mt-1">
              Für Gruppen über 50 Personen bieten wir individuelle Angebote an.
              Bitte senden Sie Ihre Anfrage direkt an{" "}
              <a
                href="mailto:events@goodlife-group.de"
                className="font-semibold text-coral underline hover:text-coral-light"
              >
                events@goodlife-group.de
              </a>
            </p>
          </div>
        </div>

        {/* Validierungshinweis */}
        {personCount > MAX_PERSONS && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Maximal {MAX_PERSONS} Personen möglich. Für größere Gruppen kontaktieren Sie uns bitte per E-Mail.</span>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-end">
          <Button
            size="lg"
            disabled={!canContinue}
            onClick={() => nextStep()}
            className="bg-coral hover:bg-coral-light"
          >
            Weiter zu Datum & Uhrzeit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
