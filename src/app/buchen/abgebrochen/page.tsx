"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function AbgebrochenPage() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-800">
            Zahlung abgebrochen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Die Zahlung wurde nicht abgeschlossen. Die reservierten Tische
            werden automatisch wieder freigegeben.
          </p>
          <p className="text-sm text-gray-500">
            Sie können jederzeit eine neue Buchung starten.
          </p>
          <div className="pt-4">
            <Button onClick={() => (window.location.href = "/buchen")}>
              Erneut buchen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
