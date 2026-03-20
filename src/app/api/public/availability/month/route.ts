import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SEATS_PER_TABLE = 12;

/**
 * GET /api/public/availability/month?month=2026-11&personCount=50
 * Returns availability for each day of the given month, considering person count.
 * Kapazität gilt TAGESWEIT – alle Zeitfenster teilen sich den gleichen Tischpool.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthStr = searchParams.get("month") || "";
    const personCountRaw = parseInt(searchParams.get("personCount") || "10", 10);

    if (!monthStr.match(/^\d{4}-\d{2}$/)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "month muss im Format YYYY-MM sein" },
        { status: 400 }
      );
    }

    // personCount validieren
    if (isNaN(personCountRaw) || personCountRaw < 1 || personCountRaw > 200) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "personCount muss zwischen 1 und 200 liegen" },
        { status: 400 }
      );
    }
    const personCount = personCountRaw;

    // Finde das erste Venue
    const venue = await prisma.venue.findFirst();
    if (!venue) {
      return NextResponse.json({ dates: {}, venueId: "" });
    }

    // Season Config laden
    const season = await prisma.seasonConfig.findUnique({
      where: { venueId: venue.id },
    });

    if (!season) {
      return NextResponse.json({ dates: {}, venueId: venue.id });
    }

    // Monatsanfang und -ende berechnen
    const [yearStr, monStr] = monthStr.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Alle aktiven Tische (= max. Sitzplätze)
    const totalActiveTables = await prisma.table.count({
      where: {
        area: { venueId: venue.id },
        isActive: true,
      },
    });
    const totalSeats = totalActiveTables * SEATS_PER_TABLE;

    // Benötigte Tische für die Personenzahl
    const requiredTables = Math.ceil(personCount / SEATS_PER_TABLE);

    // Geblockte Tage laden (UTC-Daten für konsistente Vergleiche mit DB)
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const blockedDates = await prisma.dateConfig.findMany({
      where: {
        venueId: venue.id,
        date: { gte: startDate, lte: endDate },
        isBlocked: true,
      },
    });
    const blockedDateSet = new Set(
      blockedDates.map((d) => d.date.toISOString().split("T")[0])
    );

    // Alle Tischreservierungen im Monat – TAGESWEIT aggregiert
    // (NICHT pro Zeitfenster, sondern pro Tag!)
    const bookingsInMonth = await prisma.tableReservation.groupBy({
      by: ["date"],
      where: {
        date: { gte: startDate, lte: endDate },
        status: { in: ["HELD", "CONFIRMED"] },
        booking: {
          venueId: venue.id,
          status: { in: ["HOLD", "PENDING", "CONFIRMED"] },
        },
      },
      _count: { id: true },
    });

    const reservedTablesMap = new Map<string, number>();
    for (const b of bookingsInMonth) {
      const dateKey = b.date.toISOString().split("T")[0];
      reservedTablesMap.set(dateKey, b._count.id);
    }

    // Für jeden Tag berechnen
    const dates: Record<
      string,
      { available: boolean; availableSeats: number; availableTables: number; reason?: string }
    > = {};

    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month - 1, day));
      const dateKey = `${yearStr}-${monStr.padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // Vergangen?
      if (date < today) {
        dates[dateKey] = { available: false, availableSeats: 0, availableTables: 0, reason: "Vergangen" };
        continue;
      }

      // In der Saison?
      if (date < season.seasonStart || date > season.seasonEnd) {
        dates[dateKey] = { available: false, availableSeats: 0, availableTables: 0, reason: "Außerhalb der Saison" };
        continue;
      }

      // Wochentag aktiv? (ISO: 1=Mo, 7=So)
      const isoDay = date.getDay() === 0 ? 7 : date.getDay();
      if (!season.activeWeekdays.includes(isoDay)) {
        dates[dateKey] = { available: false, availableSeats: 0, availableTables: 0, reason: "Kein Betrieb" };
        continue;
      }

      // Geblockt?
      if (blockedDateSet.has(dateKey)) {
        dates[dateKey] = { available: false, availableSeats: 0, availableTables: 0, reason: "Gesperrt" };
        continue;
      }

      // Verfügbare Tische / Plätze berechnen (TAGESWEIT)
      const reservedTables = reservedTablesMap.get(dateKey) || 0;
      const availableTables = totalActiveTables - reservedTables;
      const availableSeats = availableTables * SEATS_PER_TABLE;

      const hasEnoughCapacity = availableTables >= requiredTables;

      dates[dateKey] = {
        available: hasEnoughCapacity,
        availableSeats,
        availableTables,
        reason: hasEnoughCapacity ? undefined : "Ausgebucht für diese Personenzahl",
      };
    }

    return NextResponse.json({
      dates,
      totalSeats,
      totalTables: totalActiveTables,
      venueId: venue.id,
    });
  } catch (error) {
    console.error("[availability/month]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
