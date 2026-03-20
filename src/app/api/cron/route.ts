import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/booking/release-expired";

/**
 * Cron-Endpoint zum Freigeben abgelaufener Holds.
 * Aufruf z.B. via Vercel Cron alle 2 Minuten:
 * vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "every 2 min" }] }
 *
 * Absicherung via CRON_SECRET Header.
 */
export async function GET(request: NextRequest) {
  // CRON_SECRET prüfen – im Produktivmodus PFLICHT
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !cronSecret) {
    console.error("[cron] CRON_SECRET nicht gesetzt – Zugriff verweigert.");
    return NextResponse.json(
      { error: "Server-Konfigurationsfehler" },
      { status: 500 }
    );
  }

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Nicht autorisiert" },
        { status: 401 }
      );
    }
  }

  try {
    const released = await releaseExpiredHolds();
    return NextResponse.json({
      success: true,
      released,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron]", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}
