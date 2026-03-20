"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

function ErfolgContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">
            Buchung bestätigt!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Vielen Dank für Ihre Buchung! Sie erhalten in Kürze eine
            Bestätigungs-E-Mail mit allen Details.
          </p>

          {sessionId && (
            <p className="text-xs text-gray-400">
              Referenz: {sessionId.slice(0, 20)}...
            </p>
          )}

          <div className="pt-4">
            <Button variant="outline" onClick={() => (window.location.href = "/buchen")}>
              Neue Buchung
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErfolgPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-white">Laden...</div>}>
      <ErfolgContent />
    </Suspense>
  );
}
