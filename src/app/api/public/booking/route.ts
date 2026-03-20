import { NextRequest, NextResponse } from "next/server";
import { createBooking, BookingError } from "@/lib/booking/create-booking";
import { createBookingSchema } from "@/lib/validators/booking.schema";
import { sendBookingConfirmation, sendInternalNotification } from "@/lib/email/send";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createBookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Validierungsfehler",
          details: result.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const booking = await createBooking(result.data);

    // Testmodus ohne Stripe: Buchung ist direkt bestätigt, daher Mail sofort senden.
    if (booking.booking.status === "CONFIRMED") {
      await sendBookingConfirmation(booking.booking.id);
      await sendInternalNotification(booking.booking.id);
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    console.error("[create-booking]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
