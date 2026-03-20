import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starte Seeding...");

  // ── 1. Venue ───────────────────────────────────────────────
  const venue = await prisma.venue.upsert({
    where: { slug: "stadtparkzauber" },
    update: {},
    create: {
      name: "StadtParkZauber",
      slug: "stadtparkzauber",
      address: "Stadtpark 1, 80331 München",
    },
  });
  console.log(`✅ Venue: ${venue.name} (${venue.id})`);

  // ── 2. Area ────────────────────────────────────────────────
  const existingArea = await prisma.area.findFirst({
    where: { venueId: venue.id },
  });

  const area = existingArea
    ? existingArea
    : await prisma.area.create({
        data: {
          venueId: venue.id,
          name: "Hauptbereich",
          sortOrder: 1,
        },
      });
  console.log(`✅ Area: ${area.name} (${area.id})`);

  // ── 3. 30 Tische (à 10-12 Plätze → 300+ Sitzplätze) ──
  const existingTables = await prisma.table.count({
    where: { areaId: area.id },
  });

  if (existingTables === 0) {
    const tables = [];
    for (let i = 1; i <= 30; i++) {
      // 2 Reihen à 15 Tische
      const row = i <= 15 ? 0 : 1;
      const col = i <= 15 ? i - 1 : i - 16;
      tables.push({
        areaId: area.id,
        label: `T${i}`,
        seats: 12,
        posX: 30 + col * 62,
        posY: 80 + row * 200,
        width: 80,
        height: 60,
        shape: "RECTANGLE" as const,
        isActive: true,
      });
    }

    await prisma.table.createMany({ data: tables });
    console.log(`✅ 30 Tische erstellt (2 Reihen à 15, je 12 Plätze = 360 Sitzplätze)`);
  } else if (existingTables < 30) {
    // Fehlende Tische ergänzen
    const missingCount = 30 - existingTables;
    const newTables = [];
    for (let i = existingTables + 1; i <= 30; i++) {
      const row = Math.floor((i - 1) / 6);
      const col = (i - 1) % 6;
      newTables.push({
        areaId: area.id,
        label: `T${i}`,
        seats: 12,
        posX: 50 + col * 150,
        posY: 50 + row * 150,
        width: 100,
        height: 100,
        shape: i % 3 === 0 ? ("ROUND" as const) : ("RECTANGLE" as const),
        isActive: true,
      });
    }
    await prisma.table.createMany({ data: newTables });
    // Bestehende Tische auf 12 Plätze aktualisieren
    await prisma.table.updateMany({
      where: { areaId: area.id },
      data: { seats: 12 },
    });
    console.log(`✅ ${missingCount} Tische ergänzt (${existingTables} → 30, je 12 Plätze)`);
  } else {
    // Update vorhandene Tische auf 12 Plätze + Rechteckig + Positionen
    const allExistingTables = await prisma.table.findMany({
      where: { areaId: area.id },
      orderBy: { label: "asc" },
    });
    for (let idx = 0; idx < allExistingTables.length; idx++) {
      const t = allExistingTables[idx];
      const row = idx < 15 ? 0 : 1;
      const col = idx < 15 ? idx : idx - 15;
      await prisma.table.update({
        where: { id: t.id },
        data: {
          seats: 12,
          shape: "RECTANGLE",
          posX: 30 + col * 62,
          posY: 80 + row * 200,
          width: 80,
          height: 60,
        },
      });
    }
    console.log(`⏭️  ${existingTables} Tische aktualisiert (2 Reihen à 15, Rechteckig, 12 Plätze)`);
  }

  // ── 4. Table Groups ────────────────────────────────────────
  // Alte Gruppen löschen und neu erstellen
  await prisma.tableGroupTable.deleteMany({
    where: { tableGroup: { venueId: venue.id } },
  });
  await prisma.tableGroup.deleteMany({
    where: { venueId: venue.id },
  });

  const allTables = await prisma.table.findMany({
    where: { areaId: area.id },
    orderBy: { label: "asc" },
  });

  const groupConfigs = [
    { name: "Klein (10-12 Pers.)", min: 10, max: 12, tableCount: 1 },
    { name: "Mittel (13-24 Pers.)", min: 13, max: 24, tableCount: 2 },
    { name: "Groß (25-36 Pers.)", min: 25, max: 36, tableCount: 3 },
    { name: "XL (37-48 Pers.)", min: 37, max: 48, tableCount: 4 },
    { name: "XXL (49-60 Pers.)", min: 49, max: 60, tableCount: 5 },
  ];

  for (const gc of groupConfigs) {
    const group = await prisma.tableGroup.create({
      data: {
        venueId: venue.id,
        name: gc.name,
        minPersons: gc.min,
        maxPersons: gc.max,
      },
    });

    const groupTables = allTables.slice(0, gc.tableCount);
    if (groupTables.length > 0) {
      await prisma.tableGroupTable.createMany({
        data: groupTables.map((t) => ({
          tableGroupId: group.id,
          tableId: t.id,
        })),
      });
    }

    console.log(`✅ TableGroup: ${gc.name} (${gc.tableCount} Tische)`);
  }

  // ── 5. Time Slots ──────────────────────────────────────────
  const existingSlots = await prisma.timeSlot.count({
    where: { venueId: venue.id },
  });

  if (existingSlots === 0) {
    const slotData = [];
    for (let hour = 12; hour <= 19; hour++) {
      const startTime = `${hour}:00`;
      const isLateSlot = hour === 19;
      const endHour = isLateSlot ? 22 : hour + 4;
      const endTime = `${endHour}:00`;
      const duration = isLateSlot ? 3 : 4;

      slotData.push({
        venueId: venue.id,
        label: isLateSlot
          ? `${startTime} – ${endTime} Uhr (${duration}h)*`
          : `${startTime} – ${endTime} Uhr (${duration}h)`,
        startTime,
        endTime,
        isActive: true,
      });
    }

    await prisma.timeSlot.createMany({ data: slotData });
    console.log(`✅ ${slotData.length} TimeSlots erstellt (12:00-19:00)`);
  } else {
    console.log(`⏭️  TimeSlots existieren bereits (${existingSlots})`);
  }

  // ── 6. Capacity Rules ──────────────────────────────────────
  // Alte Regeln löschen und neu erstellen
  await prisma.capacityRule.deleteMany({
    where: { venueId: venue.id },
  });

  await prisma.capacityRule.createMany({
    data: [
      { venueId: venue.id, minPersons: 10, maxPersons: 12, tables: 1 },
      { venueId: venue.id, minPersons: 13, maxPersons: 24, tables: 2 },
      { venueId: venue.id, minPersons: 25, maxPersons: 36, tables: 3 },
      { venueId: venue.id, minPersons: 37, maxPersons: 48, tables: 4 },
      { venueId: venue.id, minPersons: 49, maxPersons: 60, tables: 5 },
    ],
  });
  console.log("✅ 5 Kapazitätsregeln erstellt (10-60 Personen, 12er Tische)");

  // ── 7. Season Config ───────────────────────────────────────
  const existingSeason = await prisma.seasonConfig.findUnique({
    where: { venueId: venue.id },
  });

  if (!existingSeason) {
    await prisma.seasonConfig.create({
      data: {
        venueId: venue.id,
        seasonStart: new Date("2026-11-01"),
        seasonEnd: new Date("2027-01-31"),
        activeWeekdays: [1, 2, 3, 4, 5, 6, 7],
        pricePerPerson: 69.0,
        currency: "EUR",
        holdMinutes: 15,
        maxPersonsPerBooking: 50,
        minPersonsPerBooking: 10,
      },
    });
    console.log("✅ SeasonConfig erstellt (01.11.2026 - 31.01.2027, 69€/Person, max. 70 Pers.)");
  } else {
    await prisma.seasonConfig.update({
      where: { venueId: venue.id },
      data: {
        seasonStart: new Date("2026-11-01"),
        seasonEnd: new Date("2027-01-31"),
        activeWeekdays: [1, 2, 3, 4, 5, 6, 7],
        pricePerPerson: 69.0,
        maxPersonsPerBooking: 50,
        minPersonsPerBooking: 10,
      },
    });
    console.log("✅ SeasonConfig aktualisiert (69€/Person, max. 70 Pers.)");
  }

  // ── 8. Add-ons ──────────────────────────────────────────────
  // Alte Add-ons löschen und neu erstellen
  await prisma.addOn.deleteMany({
    where: { venueId: venue.id },
  });

  await prisma.addOn.create({
    data: {
      venueId: venue.id,
      name: "Verlängerung 1 Stunde",
      description: "Verlängern Sie Ihre Feier um eine zusätzliche Stunde.",
      price: 17.0,
      priceType: "PER_PERSON",
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log("✅ Add-on erstellt: Verlängerung 1 Stunde (17€/Person)");

  await prisma.addOn.create({
    data: {
      venueId: venue.id,
      name: "Brotzeitplatte",
      description: "Deftige bayerische Brotzeitplatte – kalkuliert auf 4 Personen.",
      price: 39.0,
      priceType: "FLAT",
      isActive: true,
      sortOrder: 2,
    },
  });
  console.log("✅ Add-on erstellt: Brotzeitplatte (39€/Platte, für 4 Personen)");

  // ── 9. Eisstockschießbahnen ─────────────────────────────────
  const existingLanes = await prisma.curlingLane.count({
    where: { venueId: venue.id },
  });

  if (existingLanes === 0) {
    await prisma.curlingLane.createMany({
      data: [
        { venueId: venue.id, name: "Bahn 1", isActive: true },
        { venueId: venue.id, name: "Bahn 2", isActive: true },
      ],
    });
    console.log("✅ 2 Eisstockschießbahnen erstellt (Bahn 1, Bahn 2)");
  } else {
    console.log(`⏭️  Eisstockschießbahnen existieren bereits (${existingLanes})`);
  }

  // ── 10. Admin User ──────────────────────────────────────────
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: "admin@stadtparkzauber.de" },
  });

  if (!existingAdmin) {
    const hash = await bcrypt.hash("admin1234", 12);
    await prisma.adminUser.create({
      data: {
        email: "admin@stadtparkzauber.de",
        name: "SPZ Admin",
        passwordHash: hash,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    console.log("✅ Admin-User erstellt (admin@stadtparkzauber.de / admin1234)");
  } else {
    console.log("⏭️  Admin-User existiert bereits");
  }

  console.log("\n🎄 Seeding abgeschlossen!");
  console.log(`   Venue ID: ${venue.id}`);
  console.log(`   Venue Slug: ${venue.slug}`);
  console.log(`   Saison: 01.11.2026 - 31.01.2027`);
  console.log(`   Preis: 69€/Person`);
  console.log(`   Kapazität: 30 Tische × 12 Plätze = 360 Plätze (empfohlen bis ca. 50 Gäste/Buchung)`);
  console.log(`   Extras: Verlängerung 1h (17€/Pers.), Brotzeitplatte (39€/Platte)`);
  console.log(`   Öffnungszeiten: Mo-Fr 16-22, Sa 14-22, So 12-20`);
  console.log(`   Eisstockschießen: 2 Bahnen, Mo-Fr 16-22, Sa 14-22, So 12-20`);
}

main()
  .catch((e) => {
    console.error("❌ Seed-Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
