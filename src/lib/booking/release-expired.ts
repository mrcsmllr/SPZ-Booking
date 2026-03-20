import { prisma } from "@/lib/prisma";

/**
 * Gibt abgelaufene HOLD- und PENDING-Buchungen frei.
 * Wird per Cron-Job aufgerufen (z.B. alle 2 Minuten).
 */
export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date();

  // Finde alle abgelaufenen Buchungen
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: { in: ["HOLD", "PENDING"] },
      expiresAt: {
        lt: now,
      },
    },
    select: { id: true },
  });

  if (expiredBookings.length === 0) {
    return 0;
  }

  let released = 0;

  for (const booking of expiredBookings) {
    try {
      await prisma.$transaction(async (tx) => {
        // Buchungsstatus auf EXPIRED setzen
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "EXPIRED",
            cancelledAt: now,
          },
        });

        // Tischreservierungen freigeben
        await tx.tableReservation.updateMany({
          where: {
            bookingId: booking.id,
            status: "HELD",
          },
          data: {
            status: "RELEASED",
          },
        });

        // Payment auf FAILED setzen
        await tx.payment.updateMany({
          where: {
            bookingId: booking.id,
            status: "PENDING",
          },
          data: {
            status: "FAILED",
          },
        });
      });

      released++;
    } catch (error) {
      console.error(
        `Fehler beim Freigeben der Buchung ${booking.id}:`,
        error
      );
    }
  }

  console.log(`${released} abgelaufene Buchung(en) freigegeben.`);
  return released;
}
