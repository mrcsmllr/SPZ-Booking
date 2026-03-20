import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation, sendInternalNotification } from "@/lib/email/send";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json(
      { error: "Keine Stripe-Signatur" },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET nicht konfiguriert!");
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[stripe-webhook] Signaturprüfung fehlgeschlagen:", message);
    return NextResponse.json(
      { error: `Webhook-Fehler: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        const action = session.metadata?.action;

        if (!bookingId) {
          console.error("[stripe-webhook] Keine bookingId in Metadata");
          break;
        }

        if (action === "BOOKING_UPSIZE") {
          if (session.payment_status === "paid") {
            await prisma.$transaction(async (tx) => {
              const adjustment = await tx.bookingAdjustment.findUnique({
                where: { stripeSessionId: session.id },
              });

              if (!adjustment) {
                console.error(
                  `[stripe-webhook] Kein BookingAdjustment für Session ${session.id} gefunden`
                );
                return;
              }

              if (adjustment.status === "SUCCEEDED") {
                return;
              }

              const metadata = (adjustment.metadata || {}) as {
                nextPersonCount?: number;
                nextTableCount?: number;
                addOns?: {
                  addOnId: string;
                  name: string;
                  quantity: number;
                  unitPrice: number;
                  priceType: "FLAT" | "PER_PERSON";
                }[];
                additionalTableIds?: string[];
                nextPricePerPerson?: number;
                nextSubtotal?: number;
                nextAddOnsTotal?: number;
                nextGrandTotal?: number;
              };

              const booking = await tx.booking.findUnique({
                where: { id: bookingId },
              });
              if (!booking) return;

              const nextPersonCount = metadata.nextPersonCount ?? booking.personCount;
              const nextTableCount = metadata.nextTableCount ?? booking.tableCount;
              const nextAddOns = metadata.addOns || [];
              const additionalTableIds = metadata.additionalTableIds || [];

              if (additionalTableIds.length > 0) {
                await tx.tableReservation.createMany({
                  data: additionalTableIds.map((tableId) => ({
                    bookingId,
                    tableId,
                    date: booking.date,
                    status: "CONFIRMED",
                  })),
                  skipDuplicates: true,
                });
              }

              await tx.bookingAddOn.deleteMany({
                where: { bookingId },
              });

              if (nextAddOns.length > 0) {
                await tx.bookingAddOn.createMany({
                  data: nextAddOns.map((a) => ({
                    bookingId,
                    addOnId: a.addOnId,
                    quantity: a.quantity,
                    unitPrice: a.unitPrice,
                    total:
                      a.priceType === "PER_PERSON"
                        ? a.unitPrice * nextPersonCount * a.quantity
                        : a.unitPrice * a.quantity,
                  })),
                });
              }

              await tx.booking.update({
                where: { id: bookingId },
                data: {
                  personCount: nextPersonCount,
                  tableCount: nextTableCount,
                  pricePerPerson: metadata.nextPricePerPerson ?? booking.pricePerPerson,
                  subtotal: metadata.nextSubtotal ?? booking.subtotal,
                  addOnsTotal: metadata.nextAddOnsTotal ?? booking.addOnsTotal,
                  total: metadata.nextGrandTotal ?? booking.total,
                },
              });

              await tx.bookingAdjustment.update({
                where: { id: adjustment.id },
                data: {
                  status: "SUCCEEDED",
                  stripePaymentIntent:
                    typeof session.payment_intent === "string"
                      ? session.payment_intent
                      : session.payment_intent?.id,
                },
              });
            });

            await sendBookingConfirmation(bookingId);
          }

          break;
        }

        if (session.payment_status === "paid") {
          await prisma.$transaction(async (tx) => {
            // Buchungsstatus auf CONFIRMED
            await tx.booking.update({
              where: { id: bookingId },
              data: {
                status: "CONFIRMED",
                confirmedAt: new Date(),
                expiresAt: null, // Hold aufheben
              },
            });

            // Tischreservierungen bestätigen
            await tx.tableReservation.updateMany({
              where: { bookingId, status: "HELD" },
              data: { status: "CONFIRMED" },
            });

            // Payment aktualisieren
            await tx.payment.update({
              where: { stripeSessionId: session.id },
              data: {
                status: "SUCCEEDED",
                stripePaymentIntent:
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : session.payment_intent?.id,
                paidAt: new Date(),
              },
            });
          });

          // E-Mails senden (außerhalb der Transaktion)
          await sendBookingConfirmation(bookingId);
          await sendInternalNotification(bookingId);

          console.log(
            `[stripe-webhook] Buchung ${bookingId} bestätigt.`
          );
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
          await prisma.$transaction(async (tx) => {
            const booking = await tx.booking.findUnique({
              where: { id: bookingId },
            });

            if (
              booking &&
              (booking.status === "HOLD" || booking.status === "PENDING")
            ) {
              await tx.booking.update({
                where: { id: bookingId },
                data: { status: "EXPIRED", cancelledAt: new Date() },
              });

              await tx.tableReservation.updateMany({
                where: { bookingId, status: "HELD" },
                data: { status: "RELEASED" },
              });

              await tx.payment.updateMany({
                where: { bookingId, status: "PENDING" },
                data: { status: "FAILED" },
              });
            }
          });

          console.log(
            `[stripe-webhook] Buchung ${bookingId} abgelaufen.`
          );
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unbehandeltes Event: ${event.type}`);
    }
  } catch (error) {
    console.error("[stripe-webhook] Verarbeitungsfehler:", error);
    // Trotzdem 200 zurückgeben, damit Stripe nicht erneut sendet
  }

  return NextResponse.json({ received: true });
}
