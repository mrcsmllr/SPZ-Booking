"use client";

import {
  useBookingStore,
  PRICE_PER_PERSON,
  EXTENSION_PRICE_PER_PERSON,
  BROTZEITPLATTE_PRICE,
  getTableCount,
  calculateTotal,
  calculateCurlingTotal,
} from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/shared/price-display";
import { ShieldCheck, CreditCard, Snowflake } from "lucide-react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { formatMoney } from "@/lib/utils/date";

function formatAddress(
  street?: string,
  houseNumber?: string,
  postalCode?: string,
  city?: string
): string {
  const parts: string[] = [];
  if (street || houseNumber) {
    parts.push([street, houseNumber].filter(Boolean).join(" "));
  }
  if (postalCode || city) {
    parts.push([postalCode, city].filter(Boolean).join(" "));
  }
  return parts.join(", ");
}

export function StepSummary() {
  const { data, prevStep, isSubmitting, setSubmitting } =
    useBookingStore();
  const [error, setError] = useState<string | null>(null);

  const bookingType = data.bookingType || "TABLE_ONLY";
  const isCurlingOnly = bookingType === "CURLING_ONLY";
  const isCombined = bookingType === "COMBINED";
  const personCount = data.personCount || 0;
  const tables = getTableCount(personCount);
  const addOns = data.addOns || [];
  const curlingSlots = data.curlingSlots || [];

  const { base, extension, brotzeitplatte, total: tableTotal } = calculateTotal(
    personCount,
    addOns
  );
  const curlingTotal = calculateCurlingTotal(curlingSlots);
  const grandTotal = isCurlingOnly ? curlingTotal : tableTotal + curlingTotal;

  // Extension-Label ableiten
  const extensionAddon = addOns.find((a) => a.addOnId.startsWith("extension-"));
  let extensionLabel = "";
  if (extensionAddon) {
    const hoursMatch = extensionAddon.addOnId.match(/extension-(\d+)h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 1;
    extensionLabel = `Verlängerung ${hours}h (${personCount}× ${formatMoney(EXTENSION_PRICE_PER_PERSON)} × ${hours})`;
  }

  // Brotzeitplatte
  const brotzeitplatteAddon = addOns.find(
    (a) => !a.addOnId.startsWith("extension-")
  );
  const brotzeitplatteQty = brotzeitplatteAddon?.quantity || 0;

  const customer = data.customer;
  const fullName = [customer?.firstName, customer?.lastName]
    .filter(Boolean)
    .join(" ");
  const fullAddress = formatAddress(
    customer?.street,
    customer?.houseNumber,
    customer?.postalCode,
    customer?.city
  );
  const fullBillingAddress = customer?.hasDifferentBillingAddress
    ? formatAddress(
        customer?.billingStreet,
        customer?.billingHouseNumber,
        customer?.billingPostalCode,
        customer?.billingCity
      )
    : "";
  const billingCompanyName = customer?.hasDifferentBillingAddress
    ? customer?.billingCompanyName || ""
    : "";

  const handleBook = async () => {
    if (!data.consentGiven) {
      setError("Bitte akzeptieren Sie die AGB und Datenschutzerklärung.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const customerPayload = {
        ...data.customer,
        contactName: fullName,
        address: fullAddress,
        billingAddress: fullBillingAddress || undefined,
      };

      const response = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingType: data.bookingType,
          venueId: data.venueId,
          date: data.date,
          timeSlotId: data.timeSlotId || undefined,
          personCount: isCurlingOnly ? 0 : data.personCount,
          addOns: isCurlingOnly ? [] : data.addOns,
          curlingSlots: curlingSlots.map((s) => ({
            laneId: s.laneId,
            startTime: s.startTime,
            endTime: s.endTime,
            price: s.price,
          })),
          customer: customerPayload,
          consentGiven: data.consentGiven,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Ein Fehler ist aufgetreten.");
        setSubmitting(false);
        return;
      }

      if (result.stripe?.checkoutUrl) {
        window.location.href = result.stripe.checkoutUrl;
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setSubmitting(false);
    }
  };

  const dateFormatted = data.date
    ? format(parseISO(data.date), "EEEE, dd. MMMM yyyy", { locale: de })
    : "";

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <CreditCard className="h-5 w-5 text-coral" />
          Zusammenfassung & Buchung
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Zusammenfassung */}
        <div className="space-y-4 rounded-lg bg-landhaus-cream p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-landhaus-brown-light/60">Buchungsart</p>
              <p className="font-semibold text-landhaus-brown">
                {isCurlingOnly
                  ? "Eisstockschießen"
                  : isCombined
                    ? "Tischreservierung + Eisstockschießen"
                    : "Tischreservierung"}
              </p>
            </div>
            <div>
              <p className="text-landhaus-brown-light/60">Datum</p>
              <p className="font-semibold text-landhaus-brown">
                {dateFormatted}
              </p>
            </div>
            {!isCurlingOnly && (
              <>
                <div>
                  <p className="text-landhaus-brown-light/60">Uhrzeit</p>
                  <p className="font-semibold text-landhaus-brown">
                    {data.timeSlotLabel}
                  </p>
                </div>
                <div>
                  <p className="text-landhaus-brown-light/60">Personen</p>
                  <p className="font-semibold text-landhaus-brown">
                    {personCount}
                  </p>
                </div>
                <div>
                  <p className="text-landhaus-brown-light/60">Tische</p>
                  <p className="font-semibold text-landhaus-brown">
                    {tables} (je max. 12 Plätze)
                  </p>
                </div>
              </>
            )}

            {/* Curling Slots */}
            {curlingSlots.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-landhaus-brown-light/60">
                  Eisstockschießen
                </p>
                <div className="space-y-0.5">
                  {curlingSlots.map((s, i) => (
                    <p key={i} className="font-semibold text-landhaus-brown">
                      <Snowflake className="mr-1 inline h-3.5 w-3.5 text-coral" />
                      {s.laneName}: {s.startTime} – {s.endTime} Uhr ({formatMoney(s.price)})
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-landhaus-brown-light/60">Firma</p>
              <p className="font-semibold text-landhaus-brown">
                {customer?.companyName || "–"}
              </p>
            </div>
            <div>
              <p className="text-landhaus-brown-light/60">Interne Bestellnummer</p>
              <p className="font-semibold text-landhaus-brown">
                {customer?.internalOrderNumber || "–"}
              </p>
            </div>
            <div>
              <p className="text-landhaus-brown-light/60">Ansprechpartner</p>
              <p className="font-semibold text-landhaus-brown">{fullName}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-landhaus-brown-light/60">Adresse</p>
              <p className="font-semibold text-landhaus-brown">
                {fullAddress}
              </p>
            </div>
            {fullBillingAddress && (
              <div className="sm:col-span-2">
                <p className="text-landhaus-brown-light/60">
                  Rechnungsadresse
                </p>
                {billingCompanyName && (
                  <p className="font-semibold text-landhaus-brown">
                    {billingCompanyName}
                  </p>
                )}
                <p className="font-semibold text-landhaus-brown">
                  {fullBillingAddress}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preisaufstellung */}
        <div className="mt-4 space-y-2 border-t border-landhaus-cream-dark pt-4">
          {!isCurlingOnly && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-landhaus-brown-light/70">
                  {personCount}× Weihnachtsfeier à {formatMoney(PRICE_PER_PERSON)}
                </span>
                <PriceDisplay amount={base} />
              </div>

              {extension > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-landhaus-brown-light/70">
                    {extensionLabel}
                  </span>
                  <PriceDisplay amount={extension} />
                </div>
              )}

              {brotzeitplatte > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-landhaus-brown-light/70">
                    {brotzeitplatteQty}× Brotzeitplatte à{" "}
                    {formatMoney(BROTZEITPLATTE_PRICE)}
                  </span>
                  <PriceDisplay amount={brotzeitplatte} />
                </div>
              )}
            </>
          )}

          {curlingSlots.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-landhaus-brown-light/70">
                <Snowflake className="mr-1 inline h-3.5 w-3.5" />
                Eisstockschießen ({curlingSlots.length}{" "}
                {curlingSlots.length === 1 ? "Slot" : "Slots"})
              </span>
              <PriceDisplay amount={curlingTotal} />
            </div>
          )}

          <div className="flex justify-between border-t border-landhaus-cream-dark pt-2 font-serif text-lg font-bold text-landhaus-brown">
            <span>Gesamtbetrag</span>
            <PriceDisplay amount={grandTotal} size="lg" />
          </div>

          <p className="text-right text-xs text-landhaus-brown-light/50">
            Alle Preise inkl. der gesetzlichen MwSt.
          </p>
        </div>

        {/* Fehleranzeige */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => prevStep()}
            disabled={isSubmitting}
            className="border-landhaus-cream-dark hover:bg-landhaus-cream"
          >
            Zurück
          </Button>
          <Button
            size="lg"
            variant="gold"
            isLoading={isSubmitting}
            onClick={handleBook}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Jetzt verbindlich buchen
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-landhaus-brown-light/40">
          Sie werden zur sicheren Zahlung bei Stripe weitergeleitet.
        </p>
      </CardContent>
    </Card>
  );
}
