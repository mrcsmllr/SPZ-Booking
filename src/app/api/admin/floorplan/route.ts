import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateFloorplanSchema } from "@/lib/validators/admin.schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const date = searchParams.get("date");
    const slotId = searchParams.get("slotId");

    if (!venueId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "venueId fehlt" },
        { status: 400 }
      );
    }

    const areas = await prisma.area.findMany({
      where: { venueId },
      include: {
        tables: {
          orderBy: { label: "asc" },
          include: {
            reservations:
              date && slotId
                ? {
                    where: {
                      date: new Date(date),
                      status: { in: ["HELD", "CONFIRMED"] },
                      booking: {
                        timeSlotId: slotId,
                        status: { in: ["HOLD", "PENDING", "CONFIRMED"] },
                      },
                    },
                    include: {
                      booking: {
                        select: {
                          bookingNumber: true,
                          companyName: true,
                          personCount: true,
                          status: true,
                        },
                      },
                    },
                  }
                : { where: { id: "none" } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const floorplan = {
      areas: areas.map((area) => ({
        id: area.id,
        name: area.name,
        tables: area.tables.map((table) => {
          const reservation = table.reservations[0] as
            | (typeof table.reservations[0] & {
                booking: {
                  bookingNumber: string;
                  companyName: string;
                  personCount: number;
                  status: string;
                };
              })
            | undefined;
          let status: string = "FREE";

          if (!table.isActive) {
            status = "BLOCKED";
          } else if (reservation && "booking" in reservation) {
            status =
              reservation.booking.status === "CONFIRMED"
                ? "RESERVED"
                : "HELD";
          }

          return {
            id: table.id,
            label: table.label,
            seats: table.seats,
            posX: table.posX,
            posY: table.posY,
            width: table.width,
            height: table.height,
            shape: table.shape,
            isActive: table.isActive,
            status,
            booking:
              reservation && "booking" in reservation
                ? {
                    bookingNumber: reservation.booking.bookingNumber,
                    companyName: reservation.booking.companyName,
                    personCount: reservation.booking.personCount,
                  }
                : null,
          };
        }),
      })),
    };

    return NextResponse.json(floorplan);
  } catch (error) {
    console.error("[admin/floorplan]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = updateFloorplanSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: result.error.errors },
        { status: 400 }
      );
    }

    const { tables } = result.data;

    await prisma.$transaction(
      tables.map((t) =>
        prisma.table.update({
          where: { id: t.id },
          data: {
            posX: t.posX,
            posY: t.posY,
            ...(t.width !== undefined ? { width: t.width } : {}),
            ...(t.height !== undefined ? { height: t.height } : {}),
          },
        })
      )
    );

    return NextResponse.json({
      updated: tables.length,
      message: "Raumplan gespeichert.",
    });
  } catch (error) {
    console.error("[admin/floorplan/put]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
