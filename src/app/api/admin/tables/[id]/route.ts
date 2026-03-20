import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTableSchema } from "@/lib/validators/admin.schema";

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
    const result = updateTableSchema.safeParse({ ...body, id: params.id });

    if (!result.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: result.error.errors },
        { status: 400 }
      );
    }

    const { id, ...data } = result.data;

    const table = await prisma.table.update({
      where: { id },
      data: {
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.seats !== undefined ? { seats: data.seats } : {}),
      },
    });

    return NextResponse.json({
      table: {
        id: table.id,
        label: table.label,
        seats: table.seats,
        isActive: table.isActive,
      },
      message: data.isActive === false
        ? `Tisch ${table.label} gesperrt.`
        : data.isActive === true
          ? `Tisch ${table.label} freigegeben.`
          : `Tisch ${table.label} aktualisiert.`,
    });
  } catch (error) {
    console.error("[admin/tables]", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
