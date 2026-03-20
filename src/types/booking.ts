// Typen für den Client / Frontend

export type BookingType = "TABLE_ONLY" | "CURLING_ONLY" | "COMBINED";

export interface SlotAvailability {
  id: string;
  startTime: string;
  endTime: string | null;
  label: string | null;
  totalTables: number;
  reservedTables: number;
  availableTables: number;
  isAvailable: boolean;
}

export interface CapacityRuleInfo {
  minPersons: number;
  maxPersons: number;
  tables: number;
}

export interface DateAvailabilityResponse {
  date: string;
  isBookable: boolean;
  reason?: string;
  slots: SlotAvailability[];
  capacityRules: CapacityRuleInfo[];
}

export interface AddOnInfo {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: "FLAT" | "PER_PERSON";
}

// ── Eisstockschießen ─────────────────────────────────────────

export interface CurlingSlotSelection {
  laneId: string;
  laneName: string;
  date: string;
  startTime: string; // "16:00"
  endTime: string;   // "17:00"
  price: number;     // Preis pro Stunde
}

export interface CurlingLaneAvailability {
  laneId: string;
  laneName: string;
  slots: {
    startTime: string;
    endTime: string;
    available: boolean;
    price: number;
  }[];
}

// ── Buchungs-Stepper ─────────────────────────────────────────

export interface BookingStepperData {
  bookingType: BookingType;
  venueId: string;
  date: string;
  timeSlotId: string;
  timeSlotLabel: string;
  personCount: number;
  addOns: { addOnId: string; quantity: number }[];
  curlingSlots: CurlingSlotSelection[];
  customer: {
    companyName: string;
    internalOrderNumber?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    vatId?: string;
    notes?: string;
    hasDifferentBillingAddress?: boolean;
    billingCompanyName?: string;
    billingStreet?: string;
    billingHouseNumber?: string;
    billingPostalCode?: string;
    billingCity?: string;
  };
  consentGiven: boolean;
}

export interface CreateBookingResponse {
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    personCount: number;
    tableCount: number;
    date: string;
    timeSlot: string;
    pricePerPerson: number;
    addOnsTotal: number;
    curlingTotal: number;
    subtotal: number;
    total: number;
    currency: string;
    expiresAt: string | null;
  };
  stripe: {
    checkoutUrl: string;
    sessionId: string;
  };
}

export interface BookingSummary {
  id: string;
  bookingNumber: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  date: string;
  timeSlot: { startTime: string; label: string | null };
  personCount: number;
  tableCount: number;
  tables: string[];
  addOns: { name: string; quantity: number; total: number }[];
  total: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  notes: string | null;
  createdAt: string;
}
