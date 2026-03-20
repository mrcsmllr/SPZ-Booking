import { resend, EMAIL_FROM, INTERNAL_EMAIL } from "./resend";
import { prisma } from "@/lib/prisma";
import { formatDateDE, formatMoney } from "@/lib/utils/date";
import { createManageToken } from "@/lib/booking/manage-token";

/** Escapes HTML-Sonderzeichen zur Prävention von HTML-Injection */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sendet Bestätigungs-E-Mail an den Kunden.
 */
export async function sendBookingConfirmation(bookingId: string) {
  if (!resend) {
    console.log("[E-Mail] Resend nicht konfiguriert, überspringe Bestätigungsmail.");
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      timeSlot: true,
      addOns: { include: { addOn: true } },
      tableReservations: { include: { table: true } },
      curlingReservations: { include: { curlingLane: true } },
    },
  });

  if (!booking) return;

  const addOnsList = booking.addOns
    .map((a) => `${a.addOn.name} (${a.quantity}x) – ${formatMoney(Number(a.total))}`)
    .join("\n");

  const safeName = escapeHtml(booking.contactName);
  const safeCompany = escapeHtml(booking.companyName);
  const safeAddOns = addOnsList ? escapeHtml(addOnsList) : "";
  const manageToken = createManageToken(booking.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const manageUrl = `${appUrl}/buchen/verwalten?token=${encodeURIComponent(manageToken)}`;
  const safeInternalOrder = booking.internalOrderNumber
    ? escapeHtml(booking.internalOrderNumber)
    : "";
  const curlingRows = booking.curlingReservations
    .map(
      (r) =>
        `${escapeHtml(r.curlingLane.name)}: ${escapeHtml(r.startTime)}-${escapeHtml(r.endTime)} Uhr (${formatMoney(Number(r.pricePerHour), booking.currency)})`
    )
    .join("<br/>");

  await resend.emails.send({
    from: EMAIL_FROM,
    to: booking.email,
    subject: `Buchungsbestätigung ${booking.bookingNumber} – Weihnachtsfeier`,
    html: `
      <h1>Buchungsbestätigung</h1>
      <p>Vielen Dank für Ihre Buchung, ${safeName}!</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Buchungsnummer</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(booking.bookingNumber)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Firma</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeCompany}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Datum</td><td style="padding:8px;border-bottom:1px solid #eee;">${formatDateDE(booking.date)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Uhrzeit</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(booking.timeSlot?.startTime || "–")} Uhr</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Personen</td><td style="padding:8px;border-bottom:1px solid #eee;">${booking.personCount}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Tische</td><td style="padding:8px;border-bottom:1px solid #eee;">${booking.tableCount}</td></tr>
        ${safeInternalOrder ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Interne Bestellnummer</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeInternalOrder}</td></tr>` : ""}
        ${curlingRows ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Eisstockschießen</td><td style="padding:8px;border-bottom:1px solid #eee;">${curlingRows}</td></tr>` : ""}
        ${safeAddOns ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Add-ons</td><td style="padding:8px;border-bottom:1px solid #eee;white-space:pre-line;">${safeAddOns}</td></tr>` : ""}
        <tr><td style="padding:8px;font-weight:bold;font-size:1.1em;">Gesamtbetrag</td><td style="padding:8px;font-size:1.1em;font-weight:bold;">${formatMoney(Number(booking.total), booking.currency)}</td></tr>
      </table>
      <p style="margin-top:24px;">
        <a href="${manageUrl}" style="display:inline-block;background:#d86f45;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">
          Buchung verwalten (Storno / Hinzubuchen)
        </a>
      </p>
      <p style="margin-top:24px;color:#666;">Bei Fragen erreichen Sie uns unter ${INTERNAL_EMAIL}.</p>
    `,
  });
}

/**
 * Sendet interne Benachrichtigung an Sales/Ops.
 */
export async function sendInternalNotification(bookingId: string) {
  if (!resend) {
    console.log("[E-Mail] Resend nicht konfiguriert, überspringe interne Mail.");
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      timeSlot: true,
      addOns: { include: { addOn: true } },
    },
  });

  if (!booking) return;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: INTERNAL_EMAIL,
    subject: `Neue Buchung ${booking.bookingNumber} – ${escapeHtml(booking.companyName)}`,
    html: `
      <h2>Neue Buchung eingegangen</h2>
      <p><strong>${escapeHtml(booking.bookingNumber)}</strong></p>
      <ul>
        <li>Firma: ${escapeHtml(booking.companyName)}</li>
        <li>Kontakt: ${escapeHtml(booking.contactName)} (${escapeHtml(booking.email)}, ${escapeHtml(booking.phone)})</li>
        <li>Datum: ${formatDateDE(booking.date)}, ${escapeHtml(booking.timeSlot?.startTime || "–")} Uhr</li>
        <li>Personen: ${booking.personCount}, Tische: ${booking.tableCount}</li>
        <li>Betrag: ${formatMoney(Number(booking.total), booking.currency)}</li>
        <li>Status: ${escapeHtml(booking.status)}</li>
        ${booking.notes ? `<li>Notizen: ${escapeHtml(booking.notes)}</li>` : ""}
      </ul>
    `,
  });
}
