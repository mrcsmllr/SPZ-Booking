import { prisma } from "@/lib/prisma";

/**
 * Generiert eine fortlaufende Buchungsnummer: SPZ-YYYY-XXXX
 */
export async function generateBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SPZ-${year}-`;

  const lastBooking = await prisma.booking.findFirst({
    where: {
      bookingNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      bookingNumber: "desc",
    },
    select: {
      bookingNumber: true,
    },
  });

  let nextNumber = 1;

  if (lastBooking) {
    const lastNum = parseInt(
      lastBooking.bookingNumber.replace(prefix, ""),
      10
    );
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}
