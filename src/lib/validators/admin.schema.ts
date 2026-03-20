import { z } from "zod";

// ─── Admin Login ─────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// ─── Booking Filters ─────────────────────────────────────────

export const bookingFilterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z
    .enum(["HOLD", "PENDING", "CONFIRMED", "CANCELLED", "EXPIRED"])
    .optional(),
  search: z.string().optional(),
  /**
   * kind = wie die Übersicht getrennt werden soll:
   * - ALL: alle Buchungen
   * - TABLE: nur reine Tischreservierungen (TABLE_ONLY)
   * - CURLING: nur reines Eisstockschießen (CURLING_ONLY)
   * - COMBINED: Kombipakete Tisch + Eisstock (COMBINED)
   */
  kind: z.enum(["ALL", "TABLE", "CURLING", "COMBINED"]).optional().default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type BookingFilter = z.infer<typeof bookingFilterSchema>;

// ─── Booking Actions ─────────────────────────────────────────

export const cancelBookingSchema = z.object({
  action: z.literal("cancel"),
  reason: z.string().max(500).optional(),
});

export const updateBookingNotesSchema = z.object({
  action: z.literal("update_notes"),
  notes: z.string().max(1000),
});

export const bookingActionSchema = z.discriminatedUnion("action", [
  cancelBookingSchema,
  updateBookingNotesSchema,
]);

export type BookingAction = z.infer<typeof bookingActionSchema>;

// ─── Season Config ───────────────────────────────────────────

export const updateSeasonSchema = z.object({
  seasonStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seasonEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activeWeekdays: z.array(z.number().int().min(1).max(7)),
  pricePerPerson: z.number().min(0),
  currency: z.string().default("EUR"),
  holdMinutes: z.number().int().min(5).max(60).default(15),
  maxPersonsPerBooking: z.number().int().min(1).max(200).default(50),
  minPersonsPerBooking: z.number().int().min(1).max(200).default(10),
});

export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;

// ─── Add-on ──────────────────────────────────────────────────

export const upsertAddOnSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name fehlt").max(200),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  priceType: z.enum(["FLAT", "PER_PERSON"]).default("FLAT"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type UpsertAddOnInput = z.infer<typeof upsertAddOnSchema>;

// ─── Capacity Rule ───────────────────────────────────────────

export const upsertCapacityRuleSchema = z.object({
  id: z.string().optional(),
  minPersons: z.number().int().min(1),
  maxPersons: z.number().int().min(1),
  tables: z.number().int().min(1),
});

export type UpsertCapacityRuleInput = z.infer<typeof upsertCapacityRuleSchema>;

// ─── Time Slot ───────────────────────────────────────────────

export const upsertTimeSlotSchema = z.object({
  id: z.string().optional(),
  label: z.string().max(100).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format: HH:MM")
    .optional(),
  isActive: z.boolean().default(true),
});

export type UpsertTimeSlotInput = z.infer<typeof upsertTimeSlotSchema>;

// ─── Floorplan ───────────────────────────────────────────────

export const updateFloorplanSchema = z.object({
  venueId: z.string().min(1),
  tables: z.array(
    z.object({
      id: z.string(),
      posX: z.number(),
      posY: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
  ),
});

export type UpdateFloorplanInput = z.infer<typeof updateFloorplanSchema>;

// ─── Table Admin ─────────────────────────────────────────────

export const updateTableSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  label: z.string().optional(),
  seats: z.number().int().min(1).optional(),
});

export type UpdateTableInput = z.infer<typeof updateTableSchema>;
