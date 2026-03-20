import { format, isWithinInterval, parseISO, getISODay } from "date-fns";
import { de } from "date-fns/locale";

export function formatDateDE(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd.MM.yyyy", { locale: de });
}

export function formatDateTimeDE(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd.MM.yyyy HH:mm", { locale: de });
}

export function formatWeekdayDE(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE, dd. MMMM yyyy", { locale: de });
}

export function isDateInSeason(
  date: Date,
  seasonStart: Date,
  seasonEnd: Date
): boolean {
  return isWithinInterval(date, { start: seasonStart, end: seasonEnd });
}

export function isWeekdayActive(date: Date, activeWeekdays: number[]): boolean {
  const isoDay = getISODay(date); // 1=Mo, 7=So
  return activeWeekdays.includes(isoDay);
}

export function formatMoney(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}
