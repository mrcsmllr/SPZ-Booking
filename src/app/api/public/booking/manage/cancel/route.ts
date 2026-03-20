import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { verifyManageToken } from "@/lib/booking/manage-token";
import { bookingManageCancelSchema } from "@/lib/validators/booking.schema";
import {
  calculateRefundAmount,
  getRefundPercent,
} from "@/lib/booking/cancellation-policy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingManageCancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const tokenPayload = verifyManageToken(parsed.data.token);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "Ungültiger Zugriffslink." },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: tokenPayload.bookingId },
      include: { payment: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Buchung nicht gefunden." },
        { status: 404 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "ALREADY_CANCELLED", message: "Buchung ist bereits storniert." },
        { status: 400 }
      );
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: "Nur bestätigte Buchungen können storniert werden.",
        },
        { status: 400 }
      );
    }

    const total = Number(booking.total);
    const refundPercent = getRefundPercent(booking.date);
    const refundAmount = calculateRefundAmount(total, booking.date);

    let refund:
      | {
          id: string;
          amount: number;
          status: string | null;
        }
      | null = null;

    if (refundAmount > 0 && booking.payment?.stripePaymentIntent) {
      const stripeRefund = await stripe.refunds.create({
        payment_intent: booking.payment.stripePaymentIntent,
        amount: Math.round(refundAmount * 100),
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          action: "BOOKING_CANCELLATION",
        },
      });

      refund = {
        id: stripeRefund.id,
        amount: (stripeRefund.amount ?? 0) / 100,
        status: stripeRefund.status,
      };
    }

    await prisma.$transaction(async (tx) => {
      const combinedReason = [
        booking.notes || "",
        parsed.data.reason ? `Storno-Grund: ${parsed.data.reason}` : "",
        `Storno via Self-Service. Erstattung: ${refundPercent}% (${refundAmount.toFixed(2)} ${booking.currency})`,
      ]
        .filter(Boolean)
        .join("\n");

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          notes: combinedReason || null,
        },
      });

      await tx.tableReservation.updateMany({
        where: { bookingId: booking.id },
        data: { status: "RELEASED" },
      });

      await tx.curlingReservation.updateMany({
        where: { bookingId: booking.id },
        data: { status: "RELEASED" },
      });

      if (booking.payment) {
        await tx.payment.update({
          where: { bookingId: booking.id },
          data: {
            status:
              refundAmount <= 0
                ? booking.payment.status
                : refundAmount >= total
                  ? "REFUNDED"
                  : "PARTIALLY_REFUNDED",
            refundedAt: refundAmount > 0 ? new Date() : booking.payment.refundedAt,
          },
        });
      }

      if (refundAmount > 0) {
        await tx.bookingAdjustment.create({
          data: {
            bookingId: booking.id,
            type: "CANCELLATION_REFUND",
            status: "REFUNDED",
            amount: refundAmount,
            currency: booking.currency,
            metadata: {
              refundPercent,
              reason: parsed.data.reason || null,
            },
          },
        });
      }
    });

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: "CANCELLED",
      },
      refund: refund
        ? refund
        : {
            id: null,
            amount: refundAmount,
            status: refundAmount > 0 ? "manual_or_pending" : "none",
          },
    });
  } catch (error) {
    console.error("[public/booking/manage/cancel POST]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler." },
      { status: 500 }
    );
  }
}
