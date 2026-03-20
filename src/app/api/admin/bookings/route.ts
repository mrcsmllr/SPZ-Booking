import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingFilterSchema } from "@/lib/validators/admin.schema";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const result = bookingFilterSchema.safeParse(params);

    if (!result.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: result.error.errors },
        { status: 400 }
      );
    }

    const { dateFrom, dateTo, status, search, page, limit, kind } = result.data;

    const where: Prisma.BookingWhereInput = {};

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    if (status) {
      where.status = status;
    }

    // Nach Buchungsart filtern (Tisch / Eisstock / Kombi strikt getrennt)
    if (kind && kind !== "ALL") {
      if (kind === "TABLE") {
        // Nur reine Tischreservierungen
        where.bookingType = "TABLE_ONLY" as any;
      } else if (kind === "CURLING") {
        // Nur reines Eisstockschießen
        where.bookingType = "CURLING_ONLY" as any;
      } else if (kind === "COMBINED") {
        // Nur Kombipakete
        where.bookingType = "COMBINED" as any;
      }
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { bookingNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          timeSlot: true,
          addOns: { include: { addOn: true } },
          tableReservations: { include: { table: true } },
          curlingReservations: {
            include: { curlingLane: true },
          },
          payment: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        companyName: b.companyName,
        contactName: b.contactName,
        email: b.email,
        phone: b.phone,
        address: b.address,
        vatId: b.vatId,
        date: b.date.toISOString().split("T")[0],
        timeSlot: {
          startTime: b.timeSlot?.startTime || "–",
          label: b.timeSlot?.label || null,
        },
        personCount: b.personCount,
        tableCount: b.tableCount,
        tables: b.tableReservations.map((tr) => tr.table.label),
        curlingSlots: b.curlingReservations.map((cr) => ({
          laneName: cr.curlingLane.name,
          startTime: cr.startTime,
          endTime: cr.endTime,
        })),
        addOns: b.addOns.map((a) => ({
          name: a.addOn.name,
          quantity: a.quantity,
          total: Number(a.total),
        })),
        total: Number(b.total),
        currency: b.currency,
        status: b.status,
        paymentStatus: b.payment?.status || null,
        notes: b.notes,
        createdAt: b.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[admin/bookings]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
