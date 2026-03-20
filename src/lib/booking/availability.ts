import { prisma } from "@/lib/prisma";
import { isDateInSeason, isWeekdayActive } from "@/lib/utils/date";

export interface SlotAvailability {
  id: string;
  startTime: string;
  endTime: string | null;
  label: string | null;
  totalTables: number;
  reservedTables: number;
  availableTables: number;
  isAvailable: boolean;
}

export interface DateAvailability {
  date: string;
  isBookable: boolean;
  reason?: string;
  totalTables: number;
  reservedTables: number;
  availableTables: number;
  availableSeats: number;
  slots: SlotAvailability[];
  capacityRules: {
    minPersons: number;
    maxPersons: number;
    tables: number;
  }[];
}

const SEATS_PER_TABLE = 12;

/**
 * Berechnet die Verfügbarkeit für ein bestimmtes Datum und Venue.
 * WICHTIG: Kapazität gilt TAGESWEIT – alle Zeitfenster teilen sich
 * den gleichen Pool an Tischen. Ein Tisch kann pro Tag nur einmal
 * reserviert werden, egal für welches Zeitfenster.
 */
export async function getAvailability(
  venueId: string,
  dateStr: string
): Promise<DateAvailability> {
  const date = new Date(dateStr + "T00:00:00Z");

  // 1. Season-Config laden
  const season = await prisma.seasonConfig.findUnique({
    where: { venueId },
  });

  if (!season) {
    return {
      date: dateStr,
      isBookable: false,
      reason: "Keine Saison konfiguriert.",
      totalTables: 0,
      reservedTables: 0,
      availableTables: 0,
      availableSeats: 0,
      slots: [],
      capacityRules: [],
    };
  }

  // 2. Datum in Saison?
  if (!isDateInSeason(date, season.seasonStart, season.seasonEnd)) {
    return {
      date: dateStr,
      isBookable: false,
      reason: "Datum liegt außerhalb der Saison.",
      totalTables: 0,
      reservedTables: 0,
      availableTables: 0,
      availableSeats: 0,
      slots: [],
      capacityRules: [],
    };
  }

  // 3. Wochentag aktiv?
  if (!isWeekdayActive(date, season.activeWeekdays)) {
    return {
      date: dateStr,
      isBookable: false,
      reason: "An diesem Wochentag keine Buchungen möglich.",
      totalTables: 0,
      reservedTables: 0,
      availableTables: 0,
      availableSeats: 0,
      slots: [],
      capacityRules: [],
    };
  }

  // 4. Blackout-Tag?
  const dateConfig = await prisma.dateConfig.findUnique({
    where: {
      venueId_date: {
        venueId,
        date,
      },
    },
  });

  if (dateConfig?.isBlocked) {
    return {
      date: dateStr,
      isBookable: false,
      reason: dateConfig.note || "Dieser Tag ist gesperrt.",
      totalTables: 0,
      reservedTables: 0,
      availableTables: 0,
      availableSeats: 0,
      slots: [],
      capacityRules: [],
    };
  }

  // 5. Alle aktiven Tische zählen
  const activeTables = await prisma.table.count({
    where: {
      area: { venueId },
      isActive: true,
    },
  });

  // 6. TAGESWEIT reservierte Tische zählen
  // Alle Zeitfenster teilen sich den gleichen Tischpool!
  const dailyReservedCount = await prisma.tableReservation.count({
    where: {
      date,
      status: { in: ["HELD", "CONFIRMED"] },
      booking: {
        venueId,
        status: { in: ["HOLD", "PENDING", "CONFIRMED"] },
      },
    },
  });

  const availableTablesCount = Math.max(0, activeTables - dailyReservedCount);
  const availableSeats = availableTablesCount * SEATS_PER_TABLE;

  // 7. TimeSlots laden
  const timeSlots = await prisma.timeSlot.findMany({
    where: { venueId, isActive: true },
    orderBy: { startTime: "asc" },
  });

  // Alle Slots zeigen die gleiche Tageskapazität
  const slots: SlotAvailability[] = timeSlots.map((slot) => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    label: slot.label,
    totalTables: activeTables,
    reservedTables: dailyReservedCount,
    availableTables: availableTablesCount,
    isAvailable: availableTablesCount > 0,
  }));

  // 8. Kapazitätsregeln laden
  const rules = await prisma.capacityRule.findMany({
    where: { venueId },
    orderBy: { minPersons: "asc" },
  });

  return {
    date: dateStr,
    isBookable: true,
    totalTables: activeTables,
    reservedTables: dailyReservedCount,
    availableTables: availableTablesCount,
    availableSeats,
    slots,
    capacityRules: rules.map((r) => ({
      minPersons: r.minPersons,
      maxPersons: r.maxPersons,
      tables: r.tables,
    })),
  };
}
