import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/booking/availability";
import { availabilityQuerySchema } from "@/lib/validators/booking.schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "";
    const venueId = searchParams.get("venueId") || "";

    const result = availabilityQuerySchema.safeParse({ date, venueId });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Ungültige Parameter",
          details: result.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const availability = await getAvailability(
      result.data.venueId,
      result.data.date
    );

    return NextResponse.json(availability);
  } catch (error) {
    console.error("[availability]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
