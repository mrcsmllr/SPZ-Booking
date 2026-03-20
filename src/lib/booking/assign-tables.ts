import { PrismaClient } from "@prisma/client";

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Findet und reserviert die passenden Tische für eine Buchung.
 * Wird innerhalb einer Prisma-Transaktion aufgerufen.
 *
 * WICHTIG: Tageskapazität – ein Tisch kann pro Tag nur einmal reserviert
 * werden, egal für welches Zeitfenster. Alle Buchungen eines Tages teilen
 * sich den gleichen Pool an Tischen.
 *
 * Strategie:
 * 1. Lade alle aktiven Tische des Venues
 * 2. Filtere bereits belegte Tische (HELD/CONFIRMED) am selben TAG (alle Slots!)
 * 3. Versuche eine passende TableGroup zu finden
 * 4. Fallback: Weise die nächsten N freien Tische zu
 */
export async function assignTables(
  tx: TxClient,
  params: {
    venueId: string;
    date: Date;
    timeSlotId: string; // wird für die Buchungszuordnung beibehalten
    requiredTables: number;
  }
): Promise<string[]> {
  const { venueId, date, requiredTables } = params;

  // Alle belegten Tisch-IDs für dieses Datum – TAGESWEIT (kein Slot-Filter!)
  const occupiedReservations = await tx.tableReservation.findMany({
    where: {
      date,
      status: { in: ["HELD", "CONFIRMED"] },
      booking: {
        venueId,
        status: { in: ["HOLD", "PENDING", "CONFIRMED"] },
      },
    },
    select: { tableId: true },
  });

  const occupiedIds = new Set(occupiedReservations.map((r) => r.tableId));

  // Alle aktiven Tische des Venues
  const allTables = await tx.table.findMany({
    where: {
      area: { venueId },
      isActive: true,
    },
    orderBy: [{ area: { sortOrder: "asc" } }, { label: "asc" }],
  });

  const freeTables = allTables.filter((t) => !occupiedIds.has(t.id));

  if (freeTables.length < requiredTables) {
    throw new Error(
      `Nicht genügend freie Tische. Benötigt: ${requiredTables}, Verfügbar: ${freeTables.length}`
    );
  }

  // Versuche eine passende TableGroup zu finden
  const tableGroups = await tx.tableGroup.findMany({
    where: { venueId },
    include: {
      tables: {
        include: { table: true },
      },
    },
    orderBy: { minPersons: "asc" },
  });

  // Finde eine Gruppe, deren alle Tische frei sind und die die richtige Größe hat
  for (const group of tableGroups) {
    if (group.tables.length === requiredTables) {
      const groupTableIds = group.tables.map((gt) => gt.tableId);
      const allFree = groupTableIds.every((id) => !occupiedIds.has(id));

      if (allFree) {
        return groupTableIds;
      }
    }
  }

  // Fallback: Nimm die ersten N freien Tische
  return freeTables.slice(0, requiredTables).map((t) => t.id);
}
