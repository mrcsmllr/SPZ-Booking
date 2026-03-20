"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  useBookingStore,
  EXTENSION_PRICE_PER_PERSON,
  BROTZEITPLATTE_PRICE,
  getStartHourFromLabel,
} from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Clock, Info, UtensilsCrossed, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/date";

interface ExtensionOption {
  id: string;
  hours: number;
  label: string;
  description: string;
}

interface DbAddOn {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: "FLAT" | "PER_PERSON";
}

export function StepAddons() {
  const { data, updateData, nextStep, prevStep } = useBookingStore();

  const personCount = data.personCount || 0;
  // Fix: Parse start hour from the label, not from the DB slot ID
  const startHour = getStartHourFromLabel(data.timeSlotLabel || "");

  // ── DB-Add-ons laden (z.B. Brotzeitplatte) ─────────────────
  const [dbAddOns, setDbAddOns] = useState<DbAddOn[]>([]);

  const loadAddOns = useCallback(async (venueId: string) => {
    try {
      const response = await fetch(`/api/public/addons?venueId=${venueId}`);
      const result = await response.json();
      if (result.addOns) {
        // Nur Non-Extension-Add-ons (keine Verlängerung)
        setDbAddOns(
          result.addOns.filter(
            (a: DbAddOn) => !a.name.toLowerCase().includes("verlängerung")
          )
        );
      }
    } catch {
      setDbAddOns([]);
    }
  }, []);

  useEffect(() => {
    if (data.venueId) {
      loadAddOns(data.venueId);
    }
  }, [data.venueId, loadAddOns]);

  // ── Verlängerungsoptionen basierend auf der Startzeit ───────
  const extensionOptions = useMemo((): ExtensionOption[] => {
    const options: ExtensionOption[] = [];

    // Verlängerung nur bei Startzeit ≤ 17:00 Uhr
    if (startHour > 0 && startHour <= 17) {
      options.push({
        id: "extension-1h",
        hours: 1,
        label: "Verlängerung 1 Stunde",
        description: "Verlängern Sie Ihre Feier um eine zusätzliche Stunde.",
      });
    }

    // 2 Stunden Verlängerung nur bei Startzeit ≤ 16:00 Uhr
    if (startHour > 0 && startHour <= 16) {
      options.push({
        id: "extension-2h",
        hours: 2,
        label: "Verlängerung 2 Stunden",
        description: "Verlängern Sie Ihre Feier um zwei zusätzliche Stunden.",
      });
    }

    return options;
  }, [startHour]);

  const selectedAddOns = data.addOns || [];

  // ── Extension auswählen (Toggle/Wechsel) ───────────────────
  const selectExtension = (optionId: string) => {
    const isAlreadySelected = selectedAddOns.some((a) => a.addOnId === optionId);

    if (isAlreadySelected) {
      updateData({
        addOns: selectedAddOns.filter((a) => !a.addOnId.startsWith("extension-")),
      });
    } else {
      const withoutExtensions = selectedAddOns.filter(
        (a) => !a.addOnId.startsWith("extension-")
      );
      updateData({
        addOns: [...withoutExtensions, { addOnId: optionId, quantity: 1 }],
      });
    }
  };

  // ── DB-Add-on Menge ändern ──────────────────────────────────
  const getDbAddonQuantity = (addOnId: string): number => {
    const found = selectedAddOns.find((a) => a.addOnId === addOnId);
    return found ? found.quantity : 0;
  };

  const setDbAddonQuantity = (addOnId: string, quantity: number) => {
    const withoutThis = selectedAddOns.filter((a) => a.addOnId !== addOnId);
    if (quantity <= 0) {
      updateData({ addOns: withoutThis });
    } else {
      updateData({
        addOns: [...withoutThis, { addOnId, quantity }],
      });
    }
  };

  const isSelected = (id: string) => selectedAddOns.some((a) => a.addOnId === id);

  const noExtensionAvailable = extensionOptions.length === 0;

  // Empfohlene Brotzeitplatte-Menge basierend auf Personenzahl
  const recommendedPlatters = Math.ceil(personCount / 4);

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <Sparkles className="h-5 w-5 text-coral" />
          Extras wählen
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Optional: Verlängern Sie Ihre Feier oder buchen Sie zusätzliche Extras.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ═══ VERLÄNGERUNG ═══════════════════════════════════════ */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-landhaus-brown">
            <Clock className="h-4 w-4 text-coral" />
            Verlängerung
          </h3>

          {noExtensionAvailable ? (
            <div className="flex items-start gap-3 rounded-lg bg-landhaus-cream p-4 text-sm text-landhaus-brown-light/70">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-landhaus-brown-light/50" />
              <div>
                <p className="font-medium text-landhaus-brown">
                  Keine Verlängerung verfügbar
                </p>
                <p className="mt-1">
                  Bei einer Startzeit ab 18:00 Uhr ist leider keine Verlängerung
                  möglich, da der StadtParkZauber um 22:00 Uhr schließt.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {extensionOptions.map((option) => {
                const totalPrice =
                  EXTENSION_PRICE_PER_PERSON * option.hours * personCount;
                const selected = isSelected(option.id);

                return (
                  <button
                    key={option.id}
                    onClick={() => selectExtension(option.id)}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
                      selected
                        ? "border-coral bg-coral/5 ring-2 ring-coral/20"
                        : "border-landhaus-cream-dark hover:border-coral/40 hover:bg-landhaus-cream"
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        selected
                          ? "border-coral bg-coral text-white"
                          : "border-gray-300"
                      )}
                    >
                      {selected && <Check className="h-4 w-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-coral" />
                        <p className="font-semibold text-landhaus-brown">
                          {option.label}
                        </p>
                      </div>
                      <p className="mt-0.5 text-sm text-landhaus-brown-light/60">
                        {option.description}
                      </p>
                    </div>

                    {/* Preis */}
                    <div className="shrink-0 text-right">
                      <p className="font-serif text-lg font-bold text-landhaus-brown">
                        {formatMoney(totalPrice)}
                      </p>
                      <p className="text-xs text-landhaus-brown-light/50">
                        {formatMoney(EXTENSION_PRICE_PER_PERSON)}/Person ×{" "}
                        {option.hours}h × {personCount}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ BROTZEITPLATTE / DB-ADD-ONS ════════════════════════ */}
        {dbAddOns.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-landhaus-brown">
              <UtensilsCrossed className="h-4 w-4 text-coral" />
              Speisen & Getränke
            </h3>

            <div className="space-y-3">
              {dbAddOns.map((addon) => {
                const quantity = getDbAddonQuantity(addon.id);
                const totalPrice = addon.price * quantity;
                const isBrotzeitplatte = addon.name
                  .toLowerCase()
                  .includes("brotzeit");

                return (
                  <div
                    key={addon.id}
                    className={cn(
                      "rounded-xl border-2 p-4 transition-all",
                      quantity > 0
                        ? "border-coral bg-coral/5 ring-2 ring-coral/20"
                        : "border-landhaus-cream-dark"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="h-4 w-4 text-coral" />
                          <p className="font-semibold text-landhaus-brown">
                            {addon.name}
                          </p>
                        </div>
                        {addon.description && (
                          <p className="mt-0.5 text-sm text-landhaus-brown-light/60">
                            {addon.description}
                          </p>
                        )}
                        {isBrotzeitplatte && (
                          <p className="mt-1 text-xs text-landhaus-brown-light/50">
                            💡 Empfehlung für {personCount} Personen:{" "}
                            <strong className="text-coral">
                              {recommendedPlatters}{" "}
                              {recommendedPlatters === 1 ? "Platte" : "Platten"}
                            </strong>
                          </p>
                        )}
                      </div>

                      {/* Preis pro Stück */}
                      <div className="shrink-0 text-right">
                        <p className="font-serif text-lg font-bold text-landhaus-brown">
                          {formatMoney(addon.price)}
                        </p>
                        <p className="text-xs text-landhaus-brown-light/50">
                          pro Platte
                        </p>
                      </div>
                    </div>

                    {/* Mengenauswahl */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setDbAddonQuantity(addon.id, quantity - 1)
                          }
                          disabled={quantity <= 0}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                            quantity > 0
                              ? "border-coral text-coral hover:bg-coral/10"
                              : "border-gray-200 text-gray-300"
                          )}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[2rem] text-center font-serif text-lg font-bold text-landhaus-brown">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            setDbAddonQuantity(addon.id, quantity + 1)
                          }
                          disabled={quantity >= 20}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-coral text-coral transition-colors hover:bg-coral/10"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {quantity > 0 && (
                        <p className="font-serif text-base font-bold text-coral">
                          {formatMoney(totalPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => prevStep()}
            className="border-landhaus-cream-dark hover:bg-landhaus-cream"
          >
            Zurück
          </Button>
          <Button
            size="lg"
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
