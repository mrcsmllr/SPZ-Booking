import Stripe from "stripe";

// WICHTIG:
// Auf Vercel wird während `next build`/Page-Data teils der Servercode importiert.
// Damit das Build nicht sofort fehlschlägt, wenn ihr im aktuellen Test-Setup
// (noch) keine echten Stripe Keys gesetzt habt, verwenden wir einen Fallback.
//
// Endpunkte, die wirklich Stripe API Calls machen, werden zur Laufzeit fehlschlagen,
// wenn die echten Keys fehlen. Für euren "ohne Zahlung" Buchungsflow ist das jedoch ok.
function getEnvOrFallback(name: string, fallback: string): string {
  const v = process.env[name];
  // Stripe wirft sonst bei leerer String-Value (""), deshalb trimmen + length prüfen.
  if (!v || v.trim().length === 0) return fallback;
  return v.trim();
}

const STRIPE_SECRET_KEY = getEnvOrFallback(
  "STRIPE_SECRET_KEY",
  "sk_test_dummy_placeholder_please_configure"
);
const STRIPE_PUBLISHABLE_KEY = getEnvOrFallback(
  "STRIPE_PUBLISHABLE_KEY",
  "pk_test_dummy_placeholder_please_configure"
);

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export function getStripePublishableKey(): string {
  return STRIPE_PUBLISHABLE_KEY;
}
