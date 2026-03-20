import crypto from "crypto";

interface ManageTokenPayload {
  bookingId: string;
  issuedAt: number;
}

function getManageTokenSecret(): string {
  return (
    process.env.BOOKING_MANAGE_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-manage-token-secret-change-me"
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signValue(value: string): string {
  return crypto
    .createHmac("sha256", getManageTokenSecret())
    .update(value)
    .digest("base64url");
}

export function createManageToken(bookingId: string): string {
  const payload: ManageTokenPayload = {
    bookingId,
    issuedAt: Date.now(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyManageToken(token: string): ManageTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signValue(encodedPayload);
  if (signature.length !== expected.length) {
    return null;
  }
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8")
    )
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as ManageTokenPayload;
    if (!parsed?.bookingId || !parsed?.issuedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}
