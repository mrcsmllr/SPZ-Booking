import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Verhindert, dass Next diesen Route Handler statisch rendern/auswerten will.
// (Der Handler nutzt `request.url`.)
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "venueId fehlt" },
        { status: 400 }
      );
    }

    const addOns = await prisma.addOn.findMany({
      where: {
        venueId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        priceType: true,
      },
    });

    return NextResponse.json({
      addOns: addOns.map((a) => ({
        ...a,
        price: Number(a.price),
      })),
    });
  } catch (error) {
    console.error("[addons]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
