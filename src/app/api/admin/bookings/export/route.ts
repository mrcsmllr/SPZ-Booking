import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingsToCSV } from "@/lib/utils/csv-export";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const kind = searchParams.get("kind") as
      | "ALL"
      | "TABLE"
      | "CURLING"
      | "COMBINED"
      | null;

    // Erlaubte Status-Werte
    const validStatuses = ["HOLD", "PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    // Datums-Format validieren
    if (dateFrom && !dateRegex.test(dateFrom)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "dateFrom muss im Format YYYY-MM-DD sein" },
        { status: 400 }
      );
    }
    if (dateTo && !dateRegex.test(dateTo)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "dateTo muss im Format YYYY-MM-DD sein" },
        { status: 400 }
      );
    }

    const where: Prisma.BookingWhereInput = {};

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Ungültiger Status-Wert" },
          { status: 400 }
        );
      }
      where.status = status as Prisma.EnumBookingStatusFilter;
    }

    // Nach Buchungsart filtern (optional, strikt getrennt)
    if (kind && kind !== "ALL") {
      if (kind === "TABLE") {
        where.bookingType = "TABLE_ONLY" as any;
      } else if (kind === "CURLING") {
        where.bookingType = "CURLING_ONLY" as any;
      } else if (kind === "COMBINED") {
        where.bookingType = "COMBINED" as any;
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        timeSlot: true,
        addOns: { include: { addOn: true } },
        tableReservations: { include: { table: true } },
        payment: true,
      },
      orderBy: { date: "asc" },
    });

    const csv = bookingsToCSV(bookings);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="buchungen_export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[admin/export]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
