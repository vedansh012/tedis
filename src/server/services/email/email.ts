import { serverEnv } from "@/config/env";

/**
 * Transactional email. Provider-agnostic: `console` (default, dev) prints the
 * message + any action link to the server log so flows are fully testable
 * without a provider; `resend` sends for real once RESEND_API_KEY is set.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function sendViaConsole(msg: EmailMessage): Promise<void> {
  // Deliberately structured + loud so links are easy to grab in dev.
  console.info(
    [
      "",
      "──────────────── ✉️  EMAIL (console transport) ────────────────",
      `To:      ${msg.to}`,
      `Subject: ${msg.subject}`,
      "",
      msg.text,
      "───────────────────────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

async function sendViaResend(msg: EmailMessage): Promise<void> {
  const apiKey = serverEnv.RESEND_API_KEY;
  const from = serverEnv.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend send failed (${res.status}): ${await res.text()}`);
  }
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  switch (serverEnv.EMAIL_PROVIDER) {
    case "resend":
      return sendViaResend(msg);
    case "console":
    default:
      return sendViaConsole(msg);
  }
}

/** Templates. Kept minimal + text-first; links use APP_URL. */
export function passwordResetEmail(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Reset your TedIS password",
    text: `We received a request to reset your password.\n\nReset it here:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.`,
  };
}
