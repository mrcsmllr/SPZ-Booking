import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSeasonSchema } from "@/lib/validators/admin.schema";

// Alle Einstellungen laden
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    // Default Venue laden
    const venue = await prisma.venue.findFirst({
      include: {
        seasonConfig: true,
        timeSlots: { orderBy: { startTime: "asc" } },
        addOns: { orderBy: { sortOrder: "asc" } },
        capacityRules: { orderBy: { minPersons: "asc" } },
      },
    });

    if (!venue) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Kein Venue gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      venue: {
        id: venue.id,
        name: venue.name,
        slug: venue.slug,
      },
      season: venue.seasonConfig
        ? {
            id: venue.seasonConfig.id,
            seasonStart: venue.seasonConfig.seasonStart
              .toISOString()
              .split("T")[0],
            seasonEnd: venue.seasonConfig.seasonEnd
              .toISOString()
              .split("T")[0],
            activeWeekdays: venue.seasonConfig.activeWeekdays,
            pricePerPerson: Number(venue.seasonConfig.pricePerPerson),
            currency: venue.seasonConfig.currency,
            holdMinutes: venue.seasonConfig.holdMinutes,
            maxPersonsPerBooking: venue.seasonConfig.maxPersonsPerBooking,
            minPersonsPerBooking: venue.seasonConfig.minPersonsPerBooking,
          }
        : null,
      timeSlots: venue.timeSlots.map((ts) => ({
        id: ts.id,
        label: ts.label,
        startTime: ts.startTime,
        endTime: ts.endTime,
        isActive: ts.isActive,
      })),
      addOns: venue.addOns.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        price: Number(a.price),
        priceType: a.priceType,
        isActive: a.isActive,
        sortOrder: a.sortOrder,
      })),
      capacityRules: venue.capacityRules.map((r) => ({
        id: r.id,
        minPersons: r.minPersons,
        maxPersons: r.maxPersons,
        tables: r.tables,
      })),
    });
  } catch (error) {
    console.error("[admin/settings]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

// Saison-Config aktualisieren
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = updateSeasonSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: result.error.errors },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.findFirst();
    if (!venue) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Kein Venue gefunden" },
        { status: 404 }
      );
    }

    const updated = await prisma.seasonConfig.upsert({
      where: { venueId: venue.id },
      update: {
        seasonStart: new Date(result.data.seasonStart),
        seasonEnd: new Date(result.data.seasonEnd),
        activeWeekdays: result.data.activeWeekdays,
        pricePerPerson: result.data.pricePerPerson,
        currency: result.data.currency,
        holdMinutes: result.data.holdMinutes,
        maxPersonsPerBooking: result.data.maxPersonsPerBooking,
        minPersonsPerBooking: result.data.minPersonsPerBooking,
      },
      create: {
        venueId: venue.id,
        seasonStart: new Date(result.data.seasonStart),
        seasonEnd: new Date(result.data.seasonEnd),
        activeWeekdays: result.data.activeWeekdays,
        pricePerPerson: result.data.pricePerPerson,
        currency: result.data.currency,
        holdMinutes: result.data.holdMinutes,
        maxPersonsPerBooking: result.data.maxPersonsPerBooking,
        minPersonsPerBooking: result.data.minPersonsPerBooking,
      },
    });

    return NextResponse.json({ season: updated, message: "Saison gespeichert." });
  } catch (error) {
    console.error("[admin/settings/put]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
