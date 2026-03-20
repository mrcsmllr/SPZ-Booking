import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Verhindert statische Auswertung während des Builds.
// (Dieser Handler nutzt `request.url` für Query-Parameter.)
export const dynamic = "force-dynamic";

/**
 * GET /api/public/curling/availability?date=2026-11-15&venueId=xxx
 *
 * Gibt die Eisstockschießbahn-Verfügbarkeit für ein bestimmtes Datum zurück.
 * Jede Bahn hat 1-Stunden-Slots basierend auf den Öffnungszeiten.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    let venueId = searchParams.get("venueId");

    if (!dateStr) {
      return NextResponse.json(
        { error: "date parameter required" },
        { status: 400 }
      );
    }

    // Default venue
    if (!venueId) {
      const venue = await prisma.venue.findFirst();
      if (!venue) {
        return NextResponse.json(
          { error: "No venue found" },
          { status: 404 }
        );
      }
      venueId = venue.id;
    }

    const date = new Date(dateStr + "T00:00:00Z");
    const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Öffnungszeiten ermitteln
    const hours = getCurlingHoursForDay(dayOfWeek);
    if (!hours) {
      return NextResponse.json({
        date: dateStr,
        venueId,
        lanes: [],
        message: "Geschlossen an diesem Tag",
      });
    }

    // Alle aktiven Bahnen laden
    const lanes = await prisma.curlingLane.findMany({
      where: { venueId, isActive: true },
      orderBy: { name: "asc" },
    });

    // Bestehende Reservierungen für dieses Datum laden
    const reservations = await prisma.curlingReservation.findMany({
      where: {
        curlingLaneId: { in: lanes.map((l) => l.id) },
        date,
        status: { in: ["HELD", "CONFIRMED"] },
      },
    });

    // Reservierungs-Set für schnelle Lookups
    const reservedSet = new Set(
      reservations.map((r) => `${r.curlingLaneId}:${r.startTime}`)
    );

    // Slots generieren
    const laneAvailability = lanes.map((lane) => {
      const slots = [];
      for (let h = hours.open; h < hours.close; h++) {
        const startTime = `${h}:00`;
        const endTime = `${h + 1}:00`;
        const key = `${lane.id}:${startTime}`;
        const available = !reservedSet.has(key);
        const price = getCurlingPrice(dayOfWeek, h);

        slots.push({
          startTime,
          endTime,
          available,
          price,
        });
      }

      return {
        laneId: lane.id,
        laneName: lane.name,
        slots,
      };
    });

    return NextResponse.json({
      date: dateStr,
      venueId,
      lanes: laneAvailability,
    });
  } catch (error) {
    console.error("[curling-availability]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Helper-Funktionen ─────────────────────────────────────────

function getCurlingHoursForDay(dayOfWeek: number): { open: number; close: number } | null {
  if (dayOfWeek === 0) return { open: 12, close: 20 }; // Sonntag
  if (dayOfWeek === 6) return { open: 14, close: 22 }; // Samstag
  if (dayOfWeek >= 1 && dayOfWeek <= 5) return { open: 16, close: 22 }; // Mo-Fr
  return null;
}

function getCurlingPrice(dayOfWeek: number, startHour: number): number {
  if (dayOfWeek === 0) return 39; // Sonntag: 12-20 = 39€
  if (dayOfWeek === 6) return startHour < 18 ? 69 : 89; // Samstag: 14-18=69€, 18-22=89€
  return startHour < 18 ? 39 : 69; // Mo-Fr: 16-18=39€, 18-22=69€
}
