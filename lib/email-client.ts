/**
 * Thin Resend wrapper for Canopy Create transactional email.
 *
 * All sends are fire-and-log — callers must catch errors themselves
 * or use sendEmailSafe() for automatic error suppression.
 */

import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export type EmailPayload = {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Sends a transactional email. Throws on failure.
 * Prefer sendEmailSafe() in server actions to avoid blocking the user.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = getResend();
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Canopy Create <create@canopyschool.us>";

  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

/**
 * Fire-and-log wrapper. Never throws — logs failures to console.error.
 * Use this in server actions so email failures never surface to users.
 */
export async function sendEmailSafe(
  payload: EmailPayload,
  context?: string
): Promise<void> {
  try {
    await sendEmail(payload);
  } catch (err) {
    console.error(
      `[Email] Failed to send "${payload.subject}"${context ? ` (${context})` : ""}:`,
      String(err)
    );
  }
}
