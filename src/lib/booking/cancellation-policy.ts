const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * WICHTIG:
 * Bitte die Regelwerte unten exakt auf die finalen AGB-Texte abstimmen.
 * Diese Default-Werte dienen als direkte technische Abbildung und sind bewusst zentral gekapselt.
 */
const CANCELLATION_RULES = [
  // bis 30 Kalendertage vor Termin: kostenlos (100% Rueckerstattung)
  { minDaysBefore: 30, refundPercent: 100 },
  // bis 2 Wochen vor Termin: 50% Stornokosten (50% Rueckerstattung)
  { minDaysBefore: 14, refundPercent: 50 },
  // ab 2 Wochen vor Termin: 75% Stornokosten (25% Rueckerstattung)
  { minDaysBefore: Number.NEGATIVE_INFINITY, refundPercent: 25 },
] as const;

export function getDaysBeforeBooking(bookingDate: Date, now = new Date()): number {
  const bookingMidnight = new Date(bookingDate);
  bookingMidnight.setHours(0, 0, 0, 0);
  const nowMidnight = new Date(now);
  nowMidnight.setHours(0, 0, 0, 0);
  return Math.floor((bookingMidnight.getTime() - nowMidnight.getTime()) / MS_PER_DAY);
}

export function getRefundPercent(bookingDate: Date, now = new Date()): number {
  const daysBefore = getDaysBeforeBooking(bookingDate, now);
  const matched = CANCELLATION_RULES.find((rule) => daysBefore >= rule.minDaysBefore);
  return matched?.refundPercent ?? 0;
}

export function calculateRefundAmount(total: number, bookingDate: Date, now = new Date()): number {
  const refundPercent = getRefundPercent(bookingDate, now);
  return Math.round(total * (refundPercent / 100) * 100) / 100;
}

export function getCancellationRulesText(): string[] {
  return [
    "Bis 30 Kalendertage vor dem gebuchten Termin: kostenlos (100% Rueckerstattung).",
    "Bis 2 Wochen vor dem gebuchten Termin: 50% Stornokosten (50% Rueckerstattung).",
    "Ab 2 Wochen vor dem gebuchten Termin: 75% Stornokosten (25% Rueckerstattung).",
  ];
}
