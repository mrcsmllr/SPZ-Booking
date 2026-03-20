import { create } from "zustand";
import { BookingStepperData, BookingType, CurlingSlotSelection } from "@/types/booking";

export type BookingStep =
  | "type"
  | "terms"
  | "persons"
  | "date"
  | "curling"
  | "addons"
  | "contact"
  | "summary";

// Step-Konfigurationen pro Buchungstyp
function getStepsForType(bookingType: BookingType): BookingStep[] {
  switch (bookingType) {
    case "TABLE_ONLY":
      return ["type", "terms", "persons", "date", "addons", "contact", "summary"];
    case "CURLING_ONLY":
      return ["type", "terms", "curling", "contact", "summary"];
    case "COMBINED":
      return ["type", "terms", "persons", "date", "addons", "contact", "summary"];
    default:
      return ["type", "terms", "persons", "date", "addons", "contact", "summary"];
  }
}

// Konstanten
export const PRICE_PER_PERSON = 69;
export const SEATS_PER_TABLE = 12;
export const MAX_PERSONS = 50;
export const MIN_PERSONS = 10;
export const EXTENSION_PRICE_PER_PERSON = 17;
export const BROTZEITPLATTE_PRICE = 39;

// ── Eisstock-Preise pro Bahn pro Stunde (inkl. 19% MwSt.) ──
export function getCurlingPrice(dayOfWeek: number, startHour: number): number {
  // dayOfWeek: 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa (JS Date.getDay())
  if (dayOfWeek === 0) {
    // Sonntag: 12-20 Uhr, 39€
    return 39;
  }
  if (dayOfWeek === 6) {
    // Samstag: 14-18=69€, 18-22=89€
    return startHour < 18 ? 69 : 89;
  }
  // Mo-Fr: 16-18=39€, 18-22=69€
  return startHour < 18 ? 39 : 69;
}

// Öffnungszeiten pro Wochentag (JS dayOfWeek: 0=So..6=Sa)
export function getCurlingHours(dayOfWeek: number): { open: number; close: number } | null {
  if (dayOfWeek === 0) return { open: 12, close: 20 }; // Sonntag
  if (dayOfWeek === 6) return { open: 14, close: 22 }; // Samstag
  if (dayOfWeek >= 1 && dayOfWeek <= 5) return { open: 16, close: 22 }; // Mo-Fr
  return null;
}

// Tisch-Öffnungszeiten pro ISO-Wochentag (1=Mo..7=So)
export function getVenueClosingHour(isoDay: number): number {
  if (isoDay === 7) return 20; // Sonntag
  return 22; // Mo-Sa
}

interface BookingStore {
  currentStep: BookingStep;
  stepIndex: number;
  steps: BookingStep[];
  data: Partial<BookingStepperData>;
  isSubmitting: boolean;

  setBookingType: (type: BookingType) => void;
  setStep: (step: BookingStep) => void;
  goToStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (partial: Partial<BookingStepperData>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
}

const initialData: Partial<BookingStepperData> = {
  bookingType: undefined,
  venueId: "",
  date: "",
  timeSlotId: "",
  timeSlotLabel: "",
  personCount: 0,
  addOns: [],
  curlingSlots: [],
  customer: {
    companyName: "",
    internalOrderNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    vatId: "",
    notes: "",
    hasDifferentBillingAddress: false,
    billingCompanyName: "",
    billingStreet: "",
    billingHouseNumber: "",
    billingPostalCode: "",
    billingCity: "",
  },
  consentGiven: false,
};

const DEFAULT_STEPS: BookingStep[] = ["type"];

export const useBookingStore = create<BookingStore>((set, get) => ({
  currentStep: "type",
  stepIndex: 0,
  steps: DEFAULT_STEPS,
  data: { ...initialData },
  isSubmitting: false,

  setBookingType: (type: BookingType) => {
    const steps = getStepsForType(type);
    const nextIdx = 1; // After "type" step
    set({
      steps,
      data: { ...get().data, bookingType: type, curlingSlots: [], addOns: [], date: "", timeSlotId: "", timeSlotLabel: "" },
      currentStep: steps[nextIdx],
      stepIndex: nextIdx,
    });
  },

  setStep: (step) => {
    const { steps } = get();
    const index = steps.indexOf(step);
    if (index >= 0) {
      set({ currentStep: step, stepIndex: index });
    }
  },

  goToStep: (step) => {
    const { stepIndex: currentIdx, steps } = get();
    const targetIdx = steps.indexOf(step);
    if (targetIdx >= 0 && targetIdx <= currentIdx) {
      set({ currentStep: step, stepIndex: targetIdx });
    }
  },

  nextStep: () => {
    const { stepIndex, steps } = get();
    if (stepIndex < steps.length - 1) {
      const nextIndex = stepIndex + 1;
      set({ currentStep: steps[nextIndex], stepIndex: nextIndex });
    }
  },

  prevStep: () => {
    const { stepIndex, steps } = get();
    if (stepIndex > 0) {
      const prevIndex = stepIndex - 1;
      set({ currentStep: steps[prevIndex], stepIndex: prevIndex });
    }
  },

  updateData: (partial) => {
    const { data } = get();
    set({ data: { ...data, ...partial } });
  },

  setSubmitting: (isSubmitting) => set({ isSubmitting }),

  reset: () => {
    set({
      currentStep: "type",
      stepIndex: 0,
      steps: DEFAULT_STEPS,
      data: { ...initialData },
      isSubmitting: false,
    });
  },
}));

// Helper: Tische berechnen (12 Plätze pro Tisch)
export function getTableCount(persons: number): number {
  if (persons <= 0) return 0;
  return Math.ceil(persons / SEATS_PER_TABLE);
}

/**
 * Ermittelt die gewählte Startzeit als Zahl aus dem timeSlotId.
 * z.B. "slot-16" → 16
 */
export function getStartHourFromSlotId(slotId: string): number {
  const match = slotId.match(/slot-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Ermittelt die Startzeit als Zahl aus dem timeSlotLabel.
 * z.B. "16:00 – 20:00 Uhr (4h)" → 16
 */
export function getStartHourFromLabel(label: string): number {
  const match = label.match(/^(\d+):/);
  return match ? parseInt(match[1], 10) : 0;
}

// Helper: Gesamtpreis berechnen (Tisch-basiert)
export function calculateTotal(
  personCount: number,
  addOns: { addOnId: string; quantity: number }[]
): { base: number; extension: number; brotzeitplatte: number; total: number } {
  const base = personCount * PRICE_PER_PERSON;
  let extension = 0;
  let brotzeitplatte = 0;
  for (const addon of addOns) {
    if (addon.addOnId.startsWith("extension-")) {
      const hoursMatch = addon.addOnId.match(/extension-(\d+)h/);
      const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 1;
      extension += personCount * EXTENSION_PRICE_PER_PERSON * hours;
    } else if (!addon.addOnId.startsWith("extension-")) {
      // Standard-Add-on (z.B. Brotzeitplatte) – FLAT-Preis × Menge
      brotzeitplatte += BROTZEITPLATTE_PRICE * addon.quantity;
    }
  }
  return { base, extension, brotzeitplatte, total: base + extension + brotzeitplatte };
}

// Helper: Eisstock-Gesamtpreis berechnen
export function calculateCurlingTotal(curlingSlots: CurlingSlotSelection[]): number {
  return curlingSlots.reduce((sum, slot) => sum + slot.price, 0);
}

// Helper: Grand Total (Tisch + Extras + Eisstock)
export function calculateGrandTotal(
  personCount: number,
  addOns: { addOnId: string; quantity: number }[],
  curlingSlots: CurlingSlotSelection[]
): number {
  const { total: tableTotal } = calculateTotal(personCount, addOns);
  const curlingTotal = calculateCurlingTotal(curlingSlots);
  return tableTotal + curlingTotal;
}
