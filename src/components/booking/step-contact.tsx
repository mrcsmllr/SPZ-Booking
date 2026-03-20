"use client";

import { useState } from "react";
import { useBookingStore } from "@/hooks/use-booking-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StepContact() {
  const { data, updateData, nextStep, prevStep } = useBookingStore();
  const customer = data.customer || {
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
    billingStreet: "",
    billingHouseNumber: "",
    billingPostalCode: "",
    billingCity: "",
  };

  const [showBilling, setShowBilling] = useState(
    customer.hasDifferentBillingAddress || false
  );

  const updateCustomer = (field: string, value: string | boolean) => {
    updateData({
      customer: { ...customer, [field]: value },
    });
  };

  const handleBillingToggle = (checked: boolean) => {
    setShowBilling(checked);
    updateData({
      customer: {
        ...customer,
        hasDifferentBillingAddress: checked,
        ...(checked
          ? {}
          : {
              billingCompanyName: "",
              billingStreet: "",
              billingHouseNumber: "",
              billingPostalCode: "",
              billingCity: "",
            }),
      },
    });
  };

  // Pflichtfelder prüfen
  const addressValid =
    (customer.street || "").length >= 2 &&
    (customer.houseNumber || "").length >= 1 &&
    (customer.postalCode || "").length >= 4 &&
    (customer.city || "").length >= 2;

  const billingValid = !showBilling || (
    (customer.billingStreet || "").length >= 2 &&
    (customer.billingHouseNumber || "").length >= 1 &&
    (customer.billingPostalCode || "").length >= 4 &&
    (customer.billingCity || "").length >= 2
  );

  const canContinue =
    (customer.firstName || "").length >= 2 &&
    (customer.lastName || "").length >= 2 &&
    customer.email.includes("@") &&
    customer.phone.length >= 6 &&
    addressValid &&
    billingValid;

  return (
    <Card className="border-0 border-landhaus-cream-dark bg-white/95 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-landhaus-brown">
          <Building2 className="h-5 w-5 text-coral" />
          Kontaktdaten
        </CardTitle>
        <p className="text-sm text-landhaus-brown-light/70">
          Bitte geben Sie die Daten des Ansprechpartners und der Firma an.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Firmenname (optional) */}
          <Input
            label="Firmenname"
            placeholder="z.B. TechCorp GmbH (optional)"
            value={customer.companyName}
            onChange={(e) => updateCustomer("companyName", e.target.value)}
          />

          <Input
            label="Interne Bestellnummer"
            placeholder="z.B. PO-2026-001 (optional)"
            value={customer.internalOrderNumber || ""}
            onChange={(e) => updateCustomer("internalOrderNumber", e.target.value)}
          />

          {/* Vorname / Nachname */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Vorname *"
              placeholder="Max"
              value={customer.firstName || ""}
              onChange={(e) => updateCustomer("firstName", e.target.value)}
            />
            <Input
              label="Nachname *"
              placeholder="Mustermann"
              value={customer.lastName || ""}
              onChange={(e) => updateCustomer("lastName", e.target.value)}
            />
          </div>

          {/* E-Mail / Telefon */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="E-Mail *"
              type="email"
              placeholder="buchung@firma.de"
              value={customer.email}
              onChange={(e) => updateCustomer("email", e.target.value)}
            />
            <Input
              label="Telefon *"
              type="tel"
              placeholder="+49 176 1234567"
              value={customer.phone}
              onChange={(e) => updateCustomer("phone", e.target.value)}
            />
          </div>

          {/* Adresse – einzelne Felder */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-landhaus-brown">Adresse *</p>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-3">
                <Input
                  label="Straße"
                  placeholder="Musterstraße"
                  value={customer.street || ""}
                  onChange={(e) => updateCustomer("street", e.target.value)}
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  label="Hausnr."
                  placeholder="12a"
                  value={customer.houseNumber || ""}
                  onChange={(e) => updateCustomer("houseNumber", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Input
                  label="PLZ"
                  placeholder="80331"
                  value={customer.postalCode || ""}
                  onChange={(e) => updateCustomer("postalCode", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Ort"
                  placeholder="München"
                  value={customer.city || ""}
                  onChange={(e) => updateCustomer("city", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Abweichende Rechnungsadresse */}
          <div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showBilling}
                onChange={(e) => handleBillingToggle(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-coral accent-coral focus:ring-coral"
              />
              <span className="flex items-center gap-1 text-sm font-medium text-landhaus-brown">
                Abweichende Rechnungsadresse
                {showBilling ? (
                  <ChevronUp className="h-4 w-4 text-landhaus-brown-light/60" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-landhaus-brown-light/60" />
                )}
              </span>
            </label>

            {/* Rechnungsadresse – einzelne Felder */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                showBilling ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="space-y-3 rounded-lg border border-landhaus-cream-dark bg-landhaus-cream/30 p-4">
                <p className="text-sm font-medium text-landhaus-brown">Rechnungsadresse *</p>
                <Input
                  label="Firmenname"
                  placeholder="z.B. TechCorp GmbH (optional)"
                  value={customer.billingCompanyName || ""}
                  onChange={(e) => updateCustomer("billingCompanyName", e.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-3">
                    <Input
                      label="Straße"
                      placeholder="Musterstraße"
                      value={customer.billingStreet || ""}
                      onChange={(e) => updateCustomer("billingStreet", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Input
                      label="Hausnr."
                      placeholder="12a"
                      value={customer.billingHouseNumber || ""}
                      onChange={(e) => updateCustomer("billingHouseNumber", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <Input
                      label="PLZ"
                      placeholder="80331"
                      value={customer.billingPostalCode || ""}
                      onChange={(e) => updateCustomer("billingPostalCode", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Ort"
                      placeholder="München"
                      value={customer.billingCity || ""}
                      onChange={(e) => updateCustomer("billingCity", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* USt-IdNr. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="USt-IdNr."
              placeholder="DE123456789 (optional)"
              value={customer.vatId || ""}
              onChange={(e) => updateCustomer("vatId", e.target.value)}
            />
          </div>

          {/* Anmerkungen */}
          <div>
            <label className="block text-sm font-medium text-landhaus-brown">
              Anmerkungen{" "}
              <span className="font-normal text-landhaus-brown-light/70">
                (max. 30 Zeichen)
              </span>
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-landhaus-cream-dark bg-transparent px-3 py-2 text-sm placeholder:text-landhaus-brown-light/40 focus:outline-none focus:ring-2 focus:ring-coral"
              rows={3}
              maxLength={30}
              placeholder="Wir versuchen Wünsche und Anmerkungen zu berücksichten, können dies aber nicht garantieren. Es gelten die AGB."
              value={customer.notes || ""}
              onChange={(e) => updateCustomer("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => prevStep()}
            className="border-landhaus-cream-dark hover:bg-landhaus-cream"
          >
            Zurück
          </Button>
          <Button
            size="lg"
            disabled={!canContinue}
            onClick={() => nextStep()}
            className="bg-coral hover:bg-coral-light"
          >
            Weiter zur Zusammenfassung
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
