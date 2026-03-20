import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { bookingActionSchema } from "@/lib/validators/admin.schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      timeSlot: true,
      addOns: { include: { addOn: true } },
      tableReservations: { include: { table: true } },
      payment: true,
    },
  });

  if (!booking) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Buchung nicht gefunden" },
      { status: 404 }
    );
  }

  return NextResponse.json({ booking });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = bookingActionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: result.error.errors },
        { status: 400 }
      );
    }

    const action = result.data;
    const bookingId = params.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Buchung nicht gefunden" },
        { status: 404 }
      );
    }

    switch (action.action) {
      case "cancel": {
        if (booking.status === "CANCELLED") {
          return NextResponse.json(
            { error: "ALREADY_CANCELLED", message: "Buchung ist bereits storniert" },
            { status: 400 }
          );
        }

        let refund = null;

        if (
          booking.payment?.status === "SUCCEEDED" &&
          booking.payment.stripePaymentIntent
        ) {
          try {
            refund = await stripe.refunds.create({
              payment_intent: booking.payment.stripePaymentIntent,
            });
          } catch (err) {
            console.error("[admin/cancel] Stripe Refund Fehler:", err);
          }
        }

        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(),
              notes: action.reason
                ? `${booking.notes ? booking.notes + "\n" : ""}Storno: ${action.reason}`
                : booking.notes,
            },
          });

          await tx.tableReservation.updateMany({
            where: { bookingId },
            data: { status: "RELEASED" },
          });

          if (refund) {
            await tx.payment.update({
              where: { bookingId },
              data: {
                status: "REFUNDED",
                refundedAt: new Date(),
              },
            });
          }
        });

        return NextResponse.json({
          booking: { id: bookingId, status: "CANCELLED" },
          refund: refund
            ? {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
              }
            : null,
        });
      }

      case "update_notes": {
        const updated = await prisma.booking.update({
          where: { id: bookingId },
          data: { notes: action.notes },
        });

        return NextResponse.json({
          booking: { id: updated.id, notes: updated.notes },
        });
      }
    }
  } catch (error) {
    console.error("[admin/bookings/id]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
