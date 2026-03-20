import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyManageToken } from "@/lib/booking/manage-token";
import {
  calculateRefundAmount,
  getCancellationRulesText,
  getRefundPercent,
} from "@/lib/booking/cancellation-policy";

// Verhindert statische Auswertung während des Builds.
// (Dieser Handler nutzt `request.nextUrl.searchParams`.)
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Token fehlt." },
        { status: 400 }
      );
    }

    const payload = verifyManageToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "Ungültiger Zugriffslink." },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
      include: {
        timeSlot: true,
        payment: true,
        addOns: { include: { addOn: true } },
        tableReservations: { include: { table: true } },
        curlingReservations: { include: { curlingLane: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Buchung nicht gefunden." },
        { status: 404 }
      );
    }

    const availableAddOns = await prisma.addOn.findMany({
      where: {
        venueId: booking.venueId,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        priceType: true,
      },
    });

    const refundPercent = getRefundPercent(booking.date);
    const refundableAmount = calculateRefundAmount(Number(booking.total), booking.date);

    return NextResponse.json({
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        bookingType: booking.bookingType,
        status: booking.status,
        date: booking.date.toISOString(),
        personCount: booking.personCount,
        tableCount: booking.tableCount,
        currency: booking.currency,
        total: Number(booking.total),
        curlingTotal: Number(booking.curlingTotal),
        companyName: booking.companyName,
        contactName: booking.contactName,
        email: booking.email,
        phone: booking.phone,
        timeSlot: booking.timeSlot
          ? {
              id: booking.timeSlot.id,
              startTime: booking.timeSlot.startTime,
              endTime: booking.timeSlot.endTime,
              label: booking.timeSlot.label,
            }
          : null,
        addOns: booking.addOns.map((a) => ({
          addOnId: a.addOnId,
          quantity: a.quantity,
          unitPrice: Number(a.unitPrice),
          total: Number(a.total),
          name: a.addOn.name,
          priceType: a.addOn.priceType,
        })),
        tableReservations: booking.tableReservations.map((r) => ({
          id: r.id,
          label: r.table.label,
          status: r.status,
        })),
        curlingReservations: booking.curlingReservations.map((r) => ({
          id: r.id,
          laneName: r.curlingLane.name,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          pricePerHour: Number(r.pricePerHour),
        })),
      },
      policy: {
        rules: getCancellationRulesText(),
        refundPercent,
        refundableAmount,
      },
      capabilities: {
        canCancel: booking.status === "CONFIRMED",
        canUpsize:
          booking.status === "CONFIRMED" &&
          (booking.bookingType === "TABLE_ONLY" || booking.bookingType === "COMBINED"),
      },
      availableAddOns: availableAddOns.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        price: Number(a.price),
        priceType: a.priceType,
      })),
    });
  } catch (error) {
    console.error("[public/booking/manage GET]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler." },
      { status: 500 }
    );
  }
}
