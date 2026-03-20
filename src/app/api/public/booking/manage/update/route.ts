import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { verifyManageToken } from "@/lib/booking/manage-token";
import { calculatePrice } from "@/lib/booking/pricing";
import { bookingManageUpdateSchema } from "@/lib/validators/booking.schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingManageUpdateSchema.safeParse(body);
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
      include: {
        payment: true,
        addOns: true,
        tableReservations: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Buchung nicht gefunden." },
        { status: 404 }
      );
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "BOOKING_NOT_CONFIRMABLE", message: "Nur bestätigte Buchungen sind änderbar." },
        { status: 400 }
      );
    }

    if (booking.bookingType === "CURLING_ONLY") {
      return NextResponse.json(
        {
          error: "UNSUPPORTED_BOOKING_TYPE",
          message: "Für reine Eisstock-Buchungen sind aktuell keine Nachbuchungen verfügbar.",
        },
        { status: 400 }
      );
    }

    const targetPersonCount = parsed.data.personCount ?? booking.personCount;
    const selectedAddOns = parsed.data.addOns ?? booking.addOns.map((a) => ({
      addOnId: a.addOnId,
      quantity: a.quantity,
    }));

    if (targetPersonCount < booking.personCount) {
      return NextResponse.json(
        {
          error: "REDUCTION_NOT_ALLOWED",
          message: "Eine Reduzierung der Personenzahl ist online nicht möglich.",
        },
        { status: 400 }
      );
    }

    // Nur Hinzubuchen: keine Menge darf kleiner als der aktuelle Stand werden.
    const currentAddOnMap = new Map(booking.addOns.map((a) => [a.addOnId, a.quantity]));
    for (const item of selectedAddOns) {
      const currentQty = currentAddOnMap.get(item.addOnId) || 0;
      if (item.quantity < currentQty) {
        return NextResponse.json(
          {
            error: "REDUCTION_NOT_ALLOWED",
            message: "Eine Reduzierung bestehender Add-ons ist online nicht möglich.",
          },
          { status: 400 }
        );
      }
    }

    const season = await prisma.seasonConfig.findUnique({
      where: { venueId: booking.venueId },
    });
    if (!season) {
      return NextResponse.json(
        { error: "NO_SEASON", message: "Saisonkonfiguration fehlt." },
        { status: 400 }
      );
    }

    if (targetPersonCount > season.maxPersonsPerBooking) {
      return NextResponse.json(
        {
          error: "TOO_MANY_PERSONS",
          message: `Maximal ${season.maxPersonsPerBooking} Personen erlaubt.`,
        },
        { status: 400 }
      );
    }

    const capacityRule = await prisma.capacityRule.findFirst({
      where: {
        venueId: booking.venueId,
        minPersons: { lte: targetPersonCount },
        maxPersons: { gte: targetPersonCount },
      },
      orderBy: { minPersons: "asc" },
    });
    if (!capacityRule) {
      return NextResponse.json(
        { error: "NO_CAPACITY_RULE", message: "Keine passende Kapazitätsregel gefunden." },
        { status: 400 }
      );
    }

    const requiredTables = capacityRule.tables;
    const currentTables = booking.tableCount;
    const additionalTablesNeeded = Math.max(0, requiredTables - currentTables);

    let additionalTableIds: string[] = [];
    if (additionalTablesNeeded > 0) {
      const occupied = await prisma.tableReservation.findMany({
        where: {
          date: booking.date,
          status: { in: ["HELD", "CONFIRMED"] },
          bookingId: { not: booking.id },
          booking: {
            venueId: booking.venueId,
            status: { in: ["HOLD", "PENDING", "CONFIRMED"] },
          },
        },
        select: { tableId: true },
      });
      const occupiedIds = new Set(occupied.map((r) => r.tableId));

      const freeTables = await prisma.table.findMany({
        where: {
          area: { venueId: booking.venueId },
          isActive: true,
          id: { notIn: [...occupiedIds] },
        },
        orderBy: [{ area: { sortOrder: "asc" } }, { label: "asc" }],
        select: { id: true },
      });

      if (freeTables.length < additionalTablesNeeded) {
        return NextResponse.json(
          {
            error: "INSUFFICIENT_CAPACITY",
            message: "Nicht genügend freie Tische für die gewünschte Personenzahl.",
          },
          { status: 409 }
        );
      }
      additionalTableIds = freeTables.slice(0, additionalTablesNeeded).map((t) => t.id);
    }

    const addOnIds = selectedAddOns.map((a) => a.addOnId);
    const addOns = addOnIds.length
      ? await prisma.addOn.findMany({
          where: {
            id: { in: addOnIds },
            venueId: booking.venueId,
            isActive: true,
          },
        })
      : [];

    const addOnMap = new Map(addOns.map((a) => [a.id, a]));
    for (const selected of selectedAddOns) {
      if (selected.quantity === 0) continue;
      if (!addOnMap.has(selected.addOnId)) {
        return NextResponse.json(
          {
            error: "ADDON_NOT_FOUND",
            message: `Add-on nicht gefunden oder inaktiv: ${selected.addOnId}`,
          },
          { status: 400 }
        );
      }
    }

    const normalizedAddOns = selectedAddOns
      .filter((a) => a.quantity > 0)
      .map((a) => {
        const addOn = addOnMap.get(a.addOnId)!;
        return {
          addOnId: addOn.id,
          name: addOn.name,
          quantity: a.quantity,
          price: Number(addOn.price),
          priceType: addOn.priceType,
        };
      });

    const nextPricing = calculatePrice({
      pricePerPerson: season.pricePerPerson,
      personCount: targetPersonCount,
      addOns: normalizedAddOns,
    });

    const newGrandTotal = nextPricing.total + Number(booking.curlingTotal);
    const currentTotal = Number(booking.total);
    const delta = Math.round((newGrandTotal - currentTotal) * 100) / 100;

    if (delta <= 0) {
      return NextResponse.json(
        {
          error: "NO_UPSIZE_DELTA",
          message: "Es wurde keine kostenpflichtige Erweiterung erkannt.",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: booking.currency.toLowerCase(),
            product_data: {
              name: `Nachbuchung zur Buchung ${booking.bookingNumber}`,
              description: `Differenzbetrag fuer Erweiterung der Buchung`,
            },
            unit_amount: Math.round(delta * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        action: "BOOKING_UPSIZE",
        bookingId: booking.id,
      },
      customer_email: booking.email,
      success_url: `${appUrl}/buchen/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/buchen/verwalten?token=${encodeURIComponent(parsed.data.token)}`,
    });

    await prisma.bookingAdjustment.create({
      data: {
        bookingId: booking.id,
        type: "UPSIZE",
        status: "PENDING",
        amount: delta,
        currency: booking.currency,
        stripeSessionId: session.id,
        metadata: {
          nextPersonCount: targetPersonCount,
          nextTableCount: requiredTables,
          addOns: normalizedAddOns.map((a) => ({
            addOnId: a.addOnId,
            name: a.name,
            quantity: a.quantity,
            unitPrice: a.price,
            priceType: a.priceType,
          })),
          additionalTableIds,
          nextPricePerPerson: nextPricing.pricePerPerson,
          nextSubtotal: nextPricing.subtotal,
          nextAddOnsTotal: nextPricing.addOnsTotal,
          nextGrandTotal: newGrandTotal,
        },
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      delta,
      currency: booking.currency,
      message: "Nachzahlung erforderlich. Weiterleitung zu Stripe.",
    });
  } catch (error) {
    console.error("[public/booking/manage/update POST]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler." },
      { status: 500 }
    );
  }
}
