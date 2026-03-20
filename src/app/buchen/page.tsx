"use client";

import { useEffect } from "react";
import { Stepper } from "@/components/ui/stepper";
import { useBookingStore, type BookingStep } from "@/hooks/use-booking-store";
import { useIframeResize } from "@/hooks/use-iframe-resize";
import { BookingPriceBar } from "@/components/booking/booking-price-bar";
import { StepBookingType } from "@/components/booking/step-booking-type";
import { StepTerms } from "@/components/booking/step-terms";
import { StepDateSlot } from "@/components/booking/step-date-slot";
import { StepPersons } from "@/components/booking/step-persons";
import { StepCurling } from "@/components/booking/step-curling";
import { StepAddons } from "@/components/booking/step-addons";
import { StepContact } from "@/components/booking/step-contact";
import { StepSummary } from "@/components/booking/step-summary";

const STEP_LABEL_MAP: Record<BookingStep, string> = {
  type: "Buchungsart",
  terms: "AGB",
  persons: "Personen",
  date: "Datum & Uhrzeit",
  curling: "Eisstockschießen",
  addons: "Extras",
  contact: "Kontakt",
  summary: "Buchen",
};

export default function BookingPage() {
  const { currentStep, stepIndex, steps, goToStep, reset } = useBookingStore();
  useIframeResize();

  // Buchung bei neuem Aufruf der Seite zurücksetzen
  useEffect(() => {
    reset();
  }, [reset]);

  // VenueId beim ersten Laden setzen (Side-Effekt beibehalten)
  useEffect(() => {
    fetch("/api/public/addons?venueId=__default__")
      .catch(() => {});
  }, []);

  const handleStepClick = (stepId: string) => {
    goToStep(stepId as BookingStep);
  };

  // Dynamische Step-Labels basierend auf aktuellem Flow
  const stepLabels = steps.map((step) => ({
    id: step,
    label: STEP_LABEL_MAP[step],
  }));

  return (
    <div className="booking-container space-y-6">
      {/* Steuerleiste */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => reset()}
          className="text-xs font-medium text-coral underline underline-offset-4 hover:text-coral-light"
        >
          Buchung neu starten
        </button>
      </div>

      {/* Stepper Navigation */}
      <Stepper
        steps={stepLabels}
        currentIndex={stepIndex}
        onStepClick={handleStepClick}
      />

      {/* Gesamtbetrag-Übersicht */}
      <BookingPriceBar />

      {/* Aktueller Schritt */}
      <div className="step-enter">
        {currentStep === "type" && <StepBookingType />}
        {currentStep === "terms" && <StepTerms />}
        {currentStep === "persons" && <StepPersons />}
        {currentStep === "date" && <StepDateSlot />}
        {currentStep === "curling" && <StepCurling />}
        {currentStep === "addons" && <StepAddons />}
        {currentStep === "contact" && <StepContact />}
        {currentStep === "summary" && <StepSummary />}
      </div>
    </div>
  );
}
