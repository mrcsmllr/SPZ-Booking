"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils/date";

type ManageResponse = {
  booking: {
    bookingNumber: string;
    bookingType: "TABLE_ONLY" | "CURLING_ONLY" | "COMBINED";
    status: string;
    date: string;
    personCount: number;
    tableCount: number;
    total: number;
    currency: string;
    addOns: { addOnId: string; quantity: number; name: string }[];
  };
  policy: {
    rules: string[];
    refundPercent: number;
    refundableAmount: number;
  };
  capabilities: {
    canCancel: boolean;
    canUpsize: boolean;
  };
  availableAddOns: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    priceType: "FLAT" | "PER_PERSON";
  }[];
};

function ManageBookingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<ManageResponse | null>(null);
  const [personCount, setPersonCount] = useState<number>(10);
  const [addOnQty, setAddOnQty] = useState<Record<string, number>>({});
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    async function load() {
      if (!token) {
        setError("Kein Zugriffs-Token vorhanden.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/booking/manage?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json?.message || "Buchung konnte nicht geladen werden.");
          setLoading(false);
          return;
        }

        const initialMap: Record<string, number> = {};
        for (const item of json.booking.addOns) {
          initialMap[item.addOnId] = item.quantity;
        }

        setData(json);
        setPersonCount(json.booking.personCount);
        setAddOnQty(initialMap);
      } catch {
        setError("Netzwerkfehler beim Laden der Buchung.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const isCurlingOnly = data?.booking.bookingType === "CURLING_ONLY";
  const addOnList = useMemo(() => data?.availableAddOns || [], [data]);

  const hasUpsizeChanges = useMemo(() => {
    if (!data) return false;
    if (personCount > data.booking.personCount) return true;

    const currentMap = new Map(data.booking.addOns.map((a) => [a.addOnId, a.quantity]));
    for (const addOn of addOnList) {
      const next = addOnQty[addOn.id] || 0;
      const current = currentMap.get(addOn.id) || 0;
      if (next > current) return true;
    }
    return false;
  }, [data, personCount, addOnList, addOnQty]);

  const onSubmitUpsize = async () => {
    if (!data) return;

    setSubmittingUpdate(true);
    setError(null);
    setSuccess(null);
    try {
      const addOnsPayload = addOnList.map((a) => ({
        addOnId: a.id,
        quantity: Math.max(0, addOnQty[a.id] || 0),
      }));

      const res = await fetch("/api/public/booking/manage/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          personCount,
          addOns: addOnsPayload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || "Aenderung konnte nicht gestartet werden.");
        return;
      }

      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }

      setSuccess("Aenderung erfolgreich.");
    } catch {
      setError("Netzwerkfehler bei der Aenderung.");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const onCancelBooking = async () => {
    if (!data) return;
    if (!window.confirm("Moechten Sie die Buchung wirklich stornieren?")) return;

    setSubmittingCancel(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/public/booking/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: cancelReason || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || "Stornierung fehlgeschlagen.");
        return;
      }

      const amount = Number(json?.refund?.amount || 0);
      const currency = data.booking.currency || "EUR";
      setSuccess(
        amount > 0
          ? `Buchung wurde storniert. Rueckerstattung: ${formatMoney(amount, currency)}.`
          : "Buchung wurde storniert."
      );
    } catch {
      setError("Netzwerkfehler bei der Stornierung.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-white">Laden...</div>;
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Buchung verwalten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Buchung verwalten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Buchungsnummer:</strong> {data.booking.bookingNumber}
          </p>
          <p>
            <strong>Status:</strong> {data.booking.status}
          </p>
          <p>
            <strong>Aktueller Gesamtbetrag:</strong>{" "}
            {formatMoney(data.booking.total, data.booking.currency)}
          </p>
        </CardContent>
      </Card>

      {data.capabilities.canUpsize && !isCurlingOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Hinzubuchen (Nachzahlung)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="number"
              min={data.booking.personCount}
              max={50}
              label="Personenzahl"
              value={String(personCount)}
              onChange={(e) =>
                setPersonCount(Math.max(data.booking.personCount, Number(e.target.value || 0)))
              }
            />

            <div className="space-y-3">
              <p className="text-sm font-medium text-landhaus-brown">Add-ons</p>
              {addOnList.map((a) => (
                <div key={a.id} className="grid grid-cols-[1fr_120px] items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-landhaus-brown">{a.name}</p>
                    <p className="text-xs text-landhaus-brown-light/70">
                      {formatMoney(a.price, data.booking.currency)}{" "}
                      {a.priceType === "PER_PERSON" ? "pro Person" : "pauschal"}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    label="Menge"
                    value={String(addOnQty[a.id] || 0)}
                    onChange={(e) =>
                      setAddOnQty((prev) => ({
                        ...prev,
                        [a.id]: Math.max(0, Number(e.target.value || 0)),
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <Button
              onClick={onSubmitUpsize}
              disabled={!hasUpsizeChanges || submittingUpdate}
              isLoading={submittingUpdate}
            >
              Nachzahlung starten
            </Button>
          </CardContent>
        </Card>
      )}

      {data.capabilities.canCancel && (
        <Card>
          <CardHeader>
            <CardTitle>Stornierung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-landhaus-cream-dark bg-landhaus-cream/40 p-3 text-sm">
              <p className="font-medium">Stornoregeln</p>
              <ul className="mt-2 list-disc pl-5 text-landhaus-brown-light/80">
                {data.policy.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
              <p className="mt-2">
                Aktuelle Rueckerstattung:{" "}
                <strong>
                  {data.policy.refundPercent}% (
                  {formatMoney(data.policy.refundableAmount, data.booking.currency)})
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-landhaus-brown">
                Grund (optional)
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border border-landhaus-cream-dark bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={onCancelBooking}
              disabled={submittingCancel}
              isLoading={submittingCancel}
            >
              Buchung verbindlich stornieren
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-white">Laden...</div>}>
      <ManageBookingContent />
    </Suspense>
  );
}
