"use client";

import {
  useBookingStore,
  PRICE_PER_PERSON,
  calculateTotal,
  calculateCurlingTotal,
} from "@/hooks/use-booking-store";
import { formatMoney } from "@/lib/utils/date";

export function BookingPriceBar() {
  const { data } = useBookingStore();
  const bookingType = data.bookingType;
  const personCount = data.personCount || 0;
  const curlingSlots = data.curlingSlots || [];
  const addOns = data.addOns || [];

  const curlingTotal = calculateCurlingTotal(curlingSlots);

  // Für Curling-Only: nur Curling-Preis anzeigen
  if (bookingType === "CURLING_ONLY") {
    if (curlingSlots.length === 0) return null;

    return (
      <div className="rounded-xl border border-coral/20 bg-landhaus-green/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
            <span>
              <strong className="text-coral-light">{curlingSlots.length}</strong>{" "}
              {curlingSlots.length === 1 ? "Slot" : "Slots"} Eisstockschießen
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">Gesamtbetrag</p>
            <p className="font-serif text-xl font-bold text-coral-light">
              {formatMoney(curlingTotal)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Für TABLE_ONLY oder COMBINED
  if (personCount <= 0) return null;

  const { base, extension, brotzeitplatte, total: tableTotal } = calculateTotal(
    personCount,
    addOns
  );
  const grandTotal = tableTotal + curlingTotal;

  return (
    <div className="rounded-xl border border-coral/20 bg-landhaus-green/95 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Linke Seite: Details */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
          <span>
            <strong className="text-coral-light">{personCount}</strong>{" "}
            {personCount === 1 ? "Person" : "Personen"}
          </span>
          <span>
            × {formatMoney(PRICE_PER_PERSON)} = {formatMoney(base)}
          </span>
          {extension > 0 && (
            <span className="text-coral-light">
              + Verlängerung: {formatMoney(extension)}
            </span>
          )}
          {brotzeitplatte > 0 && (
            <span className="text-coral-light">
              + Brotzeitplatte: {formatMoney(brotzeitplatte)}
            </span>
          )}
          {curlingTotal > 0 && (
            <span className="text-coral-light">
              + Eisstock: {formatMoney(curlingTotal)}
            </span>
          )}
        </div>

        {/* Rechte Seite: Gesamtbetrag */}
        <div className="text-right">
          <p className="text-xs text-white/50">Gesamtbetrag</p>
          <p className="font-serif text-xl font-bold text-coral-light">
            {formatMoney(grandTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
