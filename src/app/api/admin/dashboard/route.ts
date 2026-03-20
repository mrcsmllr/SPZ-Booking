import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    // Standard-Venue laden
    const venue = await prisma.venue.findFirst({
      where: { slug: "stadtparkzauber" },
    });

    if (!venue) {
      return NextResponse.json(
        { error: "Venue nicht gefunden" },
        { status: 404 }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Beginn der aktuellen Woche (Montag)
    const weekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(today.getDate() - diff);

    // Beginn des aktuellen Monats
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // KPIs parallel abfragen
    const [
      bookingsToday,
      guestsThisWeek,
      revenueMonth,
      totalActiveTables,
      reservedTablesToday,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      pendingBookings,
      recentBookings,
      upcomingBookings,
    ] = await Promise.all([
      // Buchungen heute (alle Status außer EXPIRED/CANCELLED)
      prisma.booking.count({
        where: {
          venueId: venue.id,
          date: { gte: today, lt: tomorrow },
          status: { in: ["HOLD", "PENDING", "CONFIRMED"] },
        },
      }),

      // Gäste diese Woche
      prisma.booking.aggregate({
        _sum: { personCount: true },
        where: {
          venueId: venue.id,
          date: { gte: weekStart, lt: tomorrow },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
      }),

      // Umsatz diesen Monat (bestätigte Buchungen)
      prisma.booking.aggregate({
        _sum: { total: true },
        where: {
          venueId: venue.id,
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ["CONFIRMED"] },
        },
      }),

      // Aktive Tische gesamt (nur für dieses Venue)
      prisma.table.count({
        where: {
          isActive: true,
          area: { venueId: venue.id },
        },
      }),

      // Reservierte Tische heute (nur für dieses Venue)
      prisma.tableReservation.count({
        where: {
          date: today,
          status: { in: ["HELD", "CONFIRMED"] },
          booking: {
            venueId: venue.id,
            status: { in: ["HOLD", "PENDING", "CONFIRMED"] },
          },
        },
      }),

      // Gesamtzahl Buchungen (nur für dieses Venue)
      prisma.booking.count({
        where: { venueId: venue.id },
      }),

      // Bestätigte Buchungen (nur für dieses Venue)
      prisma.booking.count({
        where: { venueId: venue.id, status: "CONFIRMED" },
      }),

      // Stornierte Buchungen (nur für dieses Venue)
      prisma.booking.count({
        where: { venueId: venue.id, status: "CANCELLED" },
      }),

      // Ausstehende Buchungen (nur für dieses Venue)
      prisma.booking.count({
        where: {
          venueId: venue.id,
          status: { in: ["HOLD", "PENDING"] },
        },
      }),

      // Letzte 10 Buchungen (nur für dieses Venue)
      prisma.booking.findMany({
        where: { venueId: venue.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          timeSlot: true,
          payment: true,
        },
      }),

      // Nächste 5 anstehenden Buchungen (nur für dieses Venue)
      prisma.booking.findMany({
        where: {
          venueId: venue.id,
          date: { gte: today },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        orderBy: { date: "asc" },
        take: 5,
        include: { timeSlot: true },
      }),
    ]);

    return NextResponse.json({
      kpis: {
        bookingsToday,
        guestsThisWeek: guestsThisWeek._sum.personCount || 0,
        revenueMonth: Number(revenueMonth._sum.total || 0),
        totalTables: totalActiveTables,
        availableTables: totalActiveTables - reservedTablesToday,
        reservedTablesToday,
      },
      stats: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        pendingBookings,
      },
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        companyName: b.companyName,
        contactName: b.contactName,
        date: b.date.toISOString().split("T")[0],
        timeSlot: b.timeSlot?.startTime || "–",
        personCount: b.personCount,
        total: Number(b.total),
        status: b.status,
        paymentStatus: b.payment?.status || null,
        createdAt: b.createdAt.toISOString(),
      })),
      upcomingBookings: upcomingBookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        companyName: b.companyName,
        date: b.date.toISOString().split("T")[0],
        timeSlot: b.timeSlot?.startTime || "–",
        personCount: b.personCount,
        status: b.status,
      })),
    });
  } catch (error) {
    console.error("[admin/dashboard]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
