import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "Stadtparkzauber <stadtparkzauber@landhaus-walter.de>";
export const INTERNAL_EMAIL = process.env.INTERNAL_EMAIL || "sales@stadtparkzauber.de";
