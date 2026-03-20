import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { CreateBookingInput } from "@/lib/validators/booking.schema";
import { generateBookingNumber } from "@/lib/utils/booking-number";
import { assignTables } from "./assign-tables";
import { calculatePrice } from "./pricing";
import { isDateInSeason, isWeekdayActive } from "@/lib/utils/date";
import { Prisma } from "@prisma/client";

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export interface CreateBookingResult {
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    bookingType: string;
    personCount: number;
    tableCount: number;
    date: string;
    timeSlot: string;
    pricePerPerson: number;
    addOnsTotal: number;
    curlingTotal: number;
    subtotal: number;
    total: number;
    currency: string;
    expiresAt: string | null;
  };
  stripe: {
    checkoutUrl: string;
    sessionId: string;
  };
}

// TESTMODUS: Buchung ohne Stripe-Zahlung
// Für echte Zahlungen diese Konstante wieder auf `false` setzen
const TEST_NO_PAYMENT = true;
console.log("[create-booking] TEST_NO_PAYMENT (hardcoded) =", TEST_NO_PAYMENT);

/**
 * Erstellt eine Buchung transaktional.
 * Unterstützt TABLE_ONLY, CURLING_ONLY und COMBINED Buchungstypen.
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const result = await prisma.$transaction(
    async (tx) => {
      const bookingType = input.bookingType || "TABLE_ONLY";
      const isCurlingOnly = bookingType === "CURLING_ONLY";
      const hasTables = bookingType === "TABLE_ONLY" || bookingType === "COMBINED";
      const hasCurling = bookingType === "CURLING_ONLY" || bookingType === "COMBINED";

      // ── 1. Season & Datum validieren ───────────────────────
      const season = await tx.seasonConfig.findUnique({
        where: { venueId: input.venueId },
      });

      if (!season) {
        throw new BookingError("NO_SEASON", "Keine Saison konfiguriert.", 400);
      }

      const bookingDate = new Date(input.date + "T00:00:00Z");

      if (!isDateInSeason(bookingDate, season.seasonStart, season.seasonEnd)) {
        throw new BookingError(
          "DATE_NOT_IN_SEASON",
          "Datum liegt außerhalb der Saison.",
          400
        );
      }

      if (!isWeekdayActive(bookingDate, season.activeWeekdays)) {
        throw new BookingError(
          "WEEKDAY_INACTIVE",
          "An diesem Wochentag keine Buchungen möglich.",
          400
        );
      }

      // Blackout-Tag?
      const dateConfig = await tx.dateConfig.findUnique({
        where: {
          venueId_date: { venueId: input.venueId, date: bookingDate },
        },
      });

      if (dateConfig?.isBlocked) {
        throw new BookingError(
          "DATE_BLOCKED",
          dateConfig.note || "Dieser Tag ist gesperrt.",
          400
        );
      }

      let timeSlot: { id: string; startTime: string; label?: string | null } | null = null;
      let requiredTables = 0;
      let assignedTableIds: string[] = [];
      let pricing = {
        pricePerPerson: 0,
        subtotal: 0,
        addOnsTotal: 0,
        total: 0,
        addOns: [] as { addOnId: string; name: string; quantity: number; unitPrice: number; total: number }[],
      };

      // ── 2. Tisch-Logik (TABLE_ONLY / COMBINED) ────────────
      if (hasTables) {
        // Personenzahl prüfen
        if (input.personCount < season.minPersonsPerBooking) {
          throw new BookingError(
            "TOO_FEW_PERSONS",
            `Mindestens ${season.minPersonsPerBooking} Personen erforderlich.`,
            400
          );
        }
        if (input.personCount > season.maxPersonsPerBooking) {
          throw new BookingError(
            "TOO_MANY_PERSONS",
            `Maximal ${season.maxPersonsPerBooking} Personen möglich.`,
            400
          );
        }

        // TimeSlot prüfen
        const ts = await tx.timeSlot.findFirst({
          where: {
            id: input.timeSlotId!,
            venueId: input.venueId,
            isActive: true,
          },
        });
        if (!ts) {
          throw new BookingError(
            "SLOT_NOT_FOUND",
            "Zeitfenster nicht gefunden oder nicht aktiv.",
            404
          );
        }
        timeSlot = ts;

        // Kapazitätsregel
        const capacityRule = await tx.capacityRule.findFirst({
          where: {
            venueId: input.venueId,
            minPersons: { lte: input.personCount },
            maxPersons: { gte: input.personCount },
          },
        });
        if (!capacityRule) {
          throw new BookingError(
            "NO_CAPACITY_RULE",
            `Keine Kapazitätsregel für ${input.personCount} Personen gefunden.`,
            400
          );
        }
        requiredTables = capacityRule.tables;

        // Tische zuweisen
        try {
          assignedTableIds = await assignTables(tx, {
            venueId: input.venueId,
            date: bookingDate,
            timeSlotId: input.timeSlotId!,
            requiredTables,
          });
        } catch {
          throw new BookingError(
            "INSUFFICIENT_CAPACITY",
            `Nicht genügend Tische verfügbar für ${input.personCount} Personen.`,
            409
          );
        }

        // Add-ons & Preis berechnen
        const addOnDetails = await Promise.all(
          (input.addOns || []).map(async (ao) => {
            const extensionMatch = ao.addOnId.match(/^extension-(\d+)h$/);

            if (extensionMatch) {
              const hours = parseInt(extensionMatch[1], 10);
              const startHourMatch = timeSlot!.startTime.match(/^(\d+)/);
              const startHour = startHourMatch
                ? parseInt(startHourMatch[1], 10)
                : 0;

              if (hours === 1 && startHour > 17) {
                throw new BookingError(
                  "EXTENSION_NOT_ALLOWED",
                  "1-Stunden-Verlängerung nur bei Startzeit bis 17:00 Uhr möglich.",
                  400
                );
              }
              if (hours === 2 && startHour > 16) {
                throw new BookingError(
                  "EXTENSION_NOT_ALLOWED",
                  "2-Stunden-Verlängerung nur bei Startzeit bis 16:00 Uhr möglich.",
                  400
                );
              }

              const extensionAddOn = await tx.addOn.findFirst({
                where: {
                  venueId: input.venueId,
                  isActive: true,
                  name: { contains: "Verlängerung" },
                },
              });

              if (!extensionAddOn) {
                throw new BookingError(
                  "ADDON_NOT_FOUND",
                  "Verlängerung als Add-On nicht konfiguriert.",
                  404
                );
              }

              return {
                addOnId: extensionAddOn.id,
                name: `Verlängerung ${hours} Stunde${hours > 1 ? "n" : ""}`,
                quantity: hours,
                price: extensionAddOn.price,
                priceType: extensionAddOn.priceType as "FLAT" | "PER_PERSON",
              };
            }

            const addOn = await tx.addOn.findFirst({
              where: {
                id: ao.addOnId,
                venueId: input.venueId,
                isActive: true,
              },
            });

            if (!addOn) {
              throw new BookingError(
                "ADDON_NOT_FOUND",
                `Add-On nicht gefunden: ${ao.addOnId}`,
                404
              );
            }

            return {
              addOnId: addOn.id,
              name: addOn.name,
              quantity: ao.quantity,
              price: addOn.price,
              priceType: addOn.priceType as "FLAT" | "PER_PERSON",
            };
          })
        );

        pricing = calculatePrice({
          pricePerPerson: season.pricePerPerson,
          personCount: input.personCount,
          addOns: addOnDetails,
        });
      }

      // ── 3. Curling-Logik ───────────────────────────────────
      let curlingTotalValue = 0;
      const curlingReservationData: {
        curlingLaneId: string;
        date: Date;
        startTime: string;
        endTime: string;
        pricePerHour: number;
      }[] = [];

      if (hasCurling && input.curlingSlots && input.curlingSlots.length > 0) {
        // Bahnen validieren
        const lanes = await tx.curlingLane.findMany({
          where: { venueId: input.venueId, isActive: true },
        });
        const laneIds = new Set(lanes.map((l) => l.id));

        for (const slot of input.curlingSlots) {
          if (!laneIds.has(slot.laneId)) {
            throw new BookingError(
              "CURLING_LANE_NOT_FOUND",
              `Eisstockbahn nicht gefunden: ${slot.laneId}`,
              404
            );
          }

          // Doppelbuchung prüfen
          const existing = await tx.curlingReservation.findUnique({
            where: {
              curlingLaneId_date_startTime: {
                curlingLaneId: slot.laneId,
                date: bookingDate,
                startTime: slot.startTime,
              },
            },
          });

          if (existing && (existing.status === "HELD" || existing.status === "CONFIRMED")) {
            throw new BookingError(
              "CURLING_SLOT_TAKEN",
              `Bahn-Slot ${slot.startTime} ist bereits belegt.`,
              409
            );
          }

          curlingReservationData.push({
            curlingLaneId: slot.laneId,
            date: bookingDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            pricePerHour: slot.price,
          });

          curlingTotalValue += slot.price;
        }
      }

      // ── 4. Gesamtpreis ─────────────────────────────────────
      const grandTotal = pricing.total + curlingTotalValue;

      // ── 5. Buchung erstellen ───────────────────────────────
      const bookingNumber = await generateBookingNumber();
      const expiresAt = new Date(
        Date.now() + season.holdMinutes * 60 * 1000
      );
      const internalOrderNumber = input.customer.internalOrderNumber?.trim();
      const customerNotes = input.customer.notes?.trim();

      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          venueId: input.venueId,
          bookingType,
          timeSlotId: hasTables ? input.timeSlotId! : null,
          date: bookingDate,
          status: "HOLD",
          personCount: hasTables ? input.personCount : 0,
          tableCount: requiredTables,
          companyName: input.customer.companyName || "",
          internalOrderNumber: internalOrderNumber || null,
          contactName:
            input.customer.contactName ||
            `${input.customer.firstName} ${input.customer.lastName}`,
          email: input.customer.email,
          phone: input.customer.phone,
          address:
            input.customer.address ||
            `${input.customer.street} ${input.customer.houseNumber}, ${input.customer.postalCode} ${input.customer.city}`,
          vatId: input.customer.vatId,
          notes: customerNotes || null,
          pricePerPerson: pricing.pricePerPerson,
          addOnsTotal: pricing.addOnsTotal,
          curlingTotal: curlingTotalValue,
          subtotal: pricing.subtotal,
          total: grandTotal,
          currency: season.currency,
          consentGiven: input.consentGiven,
          consentAt: new Date(),
          expiresAt,
        },
      });

      // ── 6. Tischreservierungen erstellen ───────────────────
      if (assignedTableIds.length > 0) {
        await tx.tableReservation.createMany({
          data: assignedTableIds.map((tableId) => ({
            bookingId: booking.id,
            tableId,
            date: bookingDate,
            status: "HELD" as const,
          })),
        });
      }

      // ── 7. Add-on Buchungen erstellen ──────────────────────
      if (pricing.addOns.length > 0) {
        await tx.bookingAddOn.createMany({
          data: pricing.addOns.map((ao) => ({
            bookingId: booking.id,
            addOnId: ao.addOnId,
            quantity: ao.quantity,
            unitPrice: ao.unitPrice,
            total: ao.total,
          })),
        });
      }

      // ── 8. Curling-Reservierungen erstellen ────────────────
      if (curlingReservationData.length > 0) {
        for (const cr of curlingReservationData) {
          await tx.curlingReservation.create({
            data: {
              bookingId: booking.id,
              curlingLaneId: cr.curlingLaneId,
              date: cr.date,
              startTime: cr.startTime,
              endTime: cr.endTime,
              pricePerHour: cr.pricePerHour,
              status: "HELD",
            },
          });
        }
      }

      // ── 9. TEST-MODUS OHNE ZAHLUNG ──────────────────────────
      if (TEST_NO_PAYMENT) {
        // Buchung & Reservierungen direkt bestätigen
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            expiresAt: null,
          },
        });

        if (assignedTableIds.length > 0) {
          await tx.tableReservation.updateMany({
            where: { bookingId: booking.id },
            data: { status: "CONFIRMED" },
          });
        }

        if (curlingReservationData.length > 0) {
          await tx.curlingReservation.updateMany({
            where: { bookingId: booking.id },
            data: { status: "CONFIRMED" },
          });
        }

        return {
          booking: {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: "CONFIRMED",
            bookingType,
            personCount: booking.personCount,
            tableCount: requiredTables,
            date: input.date,
            timeSlot: timeSlot?.startTime || "",
            pricePerPerson: pricing.pricePerPerson,
            addOnsTotal: pricing.addOnsTotal,
            curlingTotal: curlingTotalValue,
            subtotal: pricing.subtotal,
            total: grandTotal,
            currency: season.currency,
            expiresAt: null,
          },
          stripe: {
            // Direkter Redirect auf Erfolgsseite im Testmodus
            checkoutUrl: `${appUrl}/buchen/erfolg?test_booking=${encodeURIComponent(
              booking.bookingNumber
            )}`,
            sessionId: "TEST_NO_PAYMENT",
          },
        };
      }

      // ── 9. Stripe Checkout Session ─────────────────────────
      const lineItems: {
        price_data: {
          currency: string;
          product_data: { name: string; description?: string };
          unit_amount: number;
        };
        quantity: number;
      }[] = [];

      // Tisch-Buchung als Line Item
      if (hasTables && pricing.subtotal > 0) {
        lineItems.push({
          price_data: {
            currency: season.currency.toLowerCase(),
            product_data: {
              name: `Weihnachtsfeier – ${input.personCount} Personen`,
              description: `Buchung ${bookingNumber} am ${input.date}${timeSlot ? `, ${timeSlot.startTime} Uhr` : ""}`,
            },
            unit_amount: Math.round(pricing.subtotal * 100),
          },
          quantity: 1,
        });
      }

      // Add-ons als separate Line Items
      for (const ao of pricing.addOns) {
        lineItems.push({
          price_data: {
            currency: season.currency.toLowerCase(),
            product_data: { name: ao.name },
            unit_amount: Math.round(ao.total * 100),
          },
          quantity: 1,
        });
      }

      // Curling als Line Items
      if (curlingReservationData.length > 0) {
        const curlingDesc = curlingReservationData
          .map((cr) => `${cr.startTime}-${cr.endTime}`)
          .join(", ");

        lineItems.push({
          price_data: {
            currency: season.currency.toLowerCase(),
            product_data: {
              name: `Eisstockschießen – ${curlingReservationData.length} Slot${curlingReservationData.length > 1 ? "s" : ""}`,
              description: `${input.date}: ${curlingDesc}`,
            },
            unit_amount: Math.round(curlingTotalValue * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
        customer_email: input.customer.email,
        success_url: `${appUrl}/buchen/erfolg?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/buchen/abgebrochen?booking_id=${booking.id}`,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
      });

      // ── 10. Payment erstellen ──────────────────────────────
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          stripeSessionId: session.id,
          amount: grandTotal,
          currency: season.currency,
          status: "PENDING",
        },
      });

      // Status auf PENDING setzen
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "PENDING" },
      });

      return {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          status: "PENDING",
          bookingType,
          personCount: booking.personCount,
          tableCount: requiredTables,
          date: input.date,
          timeSlot: timeSlot?.startTime || "",
          pricePerPerson: pricing.pricePerPerson,
          addOnsTotal: pricing.addOnsTotal,
          curlingTotal: curlingTotalValue,
          subtotal: pricing.subtotal,
          total: grandTotal,
          currency: season.currency,
          expiresAt: expiresAt.toISOString(),
        },
        stripe: {
          checkoutUrl: session.url!,
          sessionId: session.id,
        },
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 30000,
    }
  );

  return result;
}
