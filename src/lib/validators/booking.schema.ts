import { z } from "zod";

// ─── Public Booking Request ──────────────────────────────────

export const bookingAddOnSchema = z.object({
  addOnId: z
    .string()
    .min(1, "Add-On ID fehlt")
    .max(100, "Add-On ID zu lang")
    .refine(
      (val) => /^[a-zA-Z0-9_-]+$/.test(val),
      "Ungültige Add-On ID"
    ),
  quantity: z.number().int().min(1, "Mindestens 1").max(20, "Maximal 20"),
});

export const curlingSlotSchema = z.object({
  laneId: z.string().min(1, "Bahn-ID fehlt"),
  startTime: z.string().regex(/^\d{1,2}:00$/, "Startzeit im Format HH:00"),
  endTime: z.string().regex(/^\d{1,2}:00$/, "Endzeit im Format HH:00"),
  price: z.number().min(0, "Preis ungültig"),
});

export const bookingCustomerSchema = z.object({
  companyName: z
    .string()
    .max(200)
    .optional()
    .or(z.literal("")),
  internalOrderNumber: z.string().max(100).optional().or(z.literal("")),
  firstName: z
    .string()
    .min(2, "Vorname muss mindestens 2 Zeichen haben")
    .max(100),
  lastName: z
    .string()
    .min(2, "Nachname muss mindestens 2 Zeichen haben")
    .max(100),
  // Für die Backend-Kompatibilität: contactName wird aus firstName + lastName zusammengesetzt
  contactName: z.string().optional(),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z
    .string()
    .min(6, "Telefonnummer zu kurz")
    .max(30, "Telefonnummer zu lang"),
  street: z.string().min(2, "Straße muss angegeben werden").max(200),
  houseNumber: z.string().min(1, "Hausnummer muss angegeben werden").max(20),
  postalCode: z.string().min(4, "PLZ muss mindestens 4 Zeichen haben").max(10),
  city: z.string().min(2, "Ort muss angegeben werden").max(100),
  // Für die Backend-Kompatibilität: address wird zusammengesetzt
  address: z.string().optional(),
  vatId: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  hasDifferentBillingAddress: z.boolean().optional(),
  billingCompanyName: z.string().max(200).optional().or(z.literal("")),
  billingStreet: z.string().max(200).optional(),
  billingHouseNumber: z.string().max(20).optional(),
  billingPostalCode: z.string().max(10).optional(),
  billingCity: z.string().max(100).optional(),
  billingAddress: z.string().optional(),
});

export const createBookingSchema = z
  .object({
    bookingType: z.enum(["TABLE_ONLY", "CURLING_ONLY", "COMBINED"]).default("TABLE_ONLY"),
    venueId: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format YYYY-MM-DD sein"),
    timeSlotId: z.string().optional(),
    personCount: z.number().int().min(0).max(50).default(0),
    addOns: z.array(bookingAddOnSchema).default([]),
    curlingSlots: z.array(curlingSlotSchema).default([]),
    customer: bookingCustomerSchema,
    consentGiven: z.literal(true, {
      errorMap: () => ({
        message: "AGB und Datenschutz müssen akzeptiert werden",
      }),
    }),
  })
  .refine(
    (data) => {
      // TABLE_ONLY und COMBINED brauchen timeSlotId und personCount >= 10
      if (data.bookingType === "TABLE_ONLY" || data.bookingType === "COMBINED") {
        return !!data.timeSlotId && data.personCount >= 10;
      }
      // CURLING_ONLY braucht mindestens einen Curling-Slot
      if (data.bookingType === "CURLING_ONLY") {
        return data.curlingSlots.length > 0;
      }
      return true;
    },
    {
      message: "Ungültige Buchungsdaten für den gewählten Buchungstyp",
    }
  );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingCustomer = z.infer<typeof bookingCustomerSchema>;
export type BookingAddOnInput = z.infer<typeof bookingAddOnSchema>;
export type CurlingSlotInput = z.infer<typeof curlingSlotSchema>;

// ─── Availability Request ────────────────────────────────────

export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format YYYY-MM-DD sein"),
  venueId: z.string().min(1),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

// ─── Booking Management (Self-Service) ───────────────────────

export const bookingManageTokenSchema = z.object({
  token: z.string().min(20, "Ungültiger Token"),
});

export const bookingManageUpdateSchema = z.object({
  token: z.string().min(20, "Ungültiger Token"),
  personCount: z.number().int().min(10).max(50).optional(),
  addOns: z
    .array(
      z.object({
        addOnId: z.string().min(1),
        quantity: z.number().int().min(0).max(20),
      })
    )
    .optional(),
});

export const bookingManageCancelSchema = z.object({
  token: z.string().min(20, "Ungültiger Token"),
  reason: z.string().max(500).optional(),
});
