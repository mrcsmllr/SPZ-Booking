import { Booking, BookingAddOn, AddOn, TableReservation, Table, TimeSlot, Payment } from "@prisma/client";

type BookingWithRelations = Booking & {
  timeSlot: TimeSlot | null;
  addOns: (BookingAddOn & { addOn: AddOn })[];
  tableReservations: (TableReservation & { table: Table })[];
  payment: Payment | null;
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ausstehend",
  SUCCEEDED: "Bezahlt",
  FAILED: "Fehlgeschlagen",
  REFUNDED: "Erstattet",
  PARTIALLY_REFUNDED: "Teilweise erstattet",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  HOLD: "Gehalten",
  PENDING: "Ausstehend",
  CONFIRMED: "Bestätigt",
  CANCELLED: "Storniert",
  EXPIRED: "Abgelaufen",
};

export function bookingsToCSV(bookings: BookingWithRelations[]): string {
  const headers = [
    "Buchungsnummer",
    "Firma",
    "Ansprechpartner",
    "E-Mail",
    "Telefon",
    "Adresse",
    "Datum",
    "Slot",
    "Personen",
    "Tische",
    "Reservierte Tische",
    "Add-ons",
    "Preis/Person",
    "Add-ons Summe",
    "Gesamtbetrag",
    "Währung",
    "Buchungsstatus",
    "Zahlungsstatus",
    "Notizen",
    "Erstellt am",
  ];

  const rows = bookings.map((b) => {
    const addOnsText = b.addOns
      .map((a) => `${a.addOn.name} (${a.quantity}x)`)
      .join(", ");

    const tablesText = b.tableReservations
      .map((tr) => tr.table.label)
      .join(", ");

    const date = new Date(b.date).toLocaleDateString("de-DE");
    const createdAt = new Date(b.createdAt).toLocaleString("de-DE");

    return [
      b.bookingNumber,
      b.companyName,
      b.contactName,
      b.email,
      b.phone,
      b.address,
      date,
      b.timeSlot?.startTime || "–",
      b.personCount.toString(),
      b.tableCount.toString(),
      tablesText,
      addOnsText || "-",
      Number(b.pricePerPerson).toFixed(2),
      Number(b.addOnsTotal).toFixed(2),
      Number(b.total).toFixed(2),
      b.currency,
      BOOKING_STATUS_LABELS[b.status] || b.status,
      b.payment
        ? PAYMENT_STATUS_LABELS[b.payment.status] || b.payment.status
        : "Keine Zahlung",
      b.notes || "",
      createdAt,
    ];
  });

  const escapeCsv = (val: string | null) => {
    const v = val ?? "";
    if (v.includes(";") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const csvLines = [
    headers.join(";"),
    ...rows.map((row) => row.map(escapeCsv).join(";")),
  ];

  // BOM für Excel-Kompatibilität
  return "\uFEFF" + csvLines.join("\n");
}
