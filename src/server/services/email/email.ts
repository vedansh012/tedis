import { serverEnv } from "@/config/env";
import { logger } from "@/server/lib/logger";
import { renderEmail, type EmailBody } from "./templates";

/**
 * Transactional email.
 *
 * Two transports behind one interface:
 *  • `console` (default, dev) — prints the message and any action link to the
 *    server log, so every flow is testable end-to-end with no provider.
 *  • `resend` — real delivery. Selected by EMAIL_PROVIDER=resend, which
 *    `config/env.ts` refuses to boot without RESEND_API_KEY and EMAIL_FROM.
 *
 * Delivery is treated as *unreliable by design*: it is a third-party network
 * call on the critical path of signup. Everything here exists to keep a bad
 * minute at the provider from becoming a broken account:
 *   - a hard timeout, so a hung connection can't hang the request
 *   - bounded retries with backoff on transient failures only
 *   - a Result return (never a throw) so callers must decide what a failure means
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text part. Always sent — some clients prefer it, and it's the accessible fallback. */
  text: string;
  /** HTML part. Optional; built by the templates below. */
  html?: string;
}

export type SendResult = { ok: true } | { ok: false; error: string; retryable: boolean };

const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
/** 4xx are permanent (bad key, bad address) — retrying just burns quota. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sendViaConsole(msg: EmailMessage): SendResult {
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
  return { ok: true };
}

async function postToResend(msg: EmailMessage, apiKey: string, from: string) {
  // AbortSignal.timeout: without it a stalled socket blocks the signup request
  // for as long as the platform's own timeout allows.
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res;
}

async function sendViaResend(msg: EmailMessage): Promise<SendResult> {
  const apiKey = serverEnv.RESEND_API_KEY;
  const from = serverEnv.EMAIL_FROM;
  // env.ts enforces this at boot; this is the defence-in-depth branch.
  if (!apiKey || !from) {
    return { ok: false, error: "EMAIL_PROVIDER=resend requires RESEND_API_KEY and EMAIL_FROM", retryable: false };
  }

  let last: SendResult = { ok: false, error: "not attempted", retryable: true };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await postToResend(msg, apiKey, from);
      if (res.ok) {
        if (attempt > 1) logger.info("email.sent.after_retry", { attempt, subject: msg.subject });
        return { ok: true };
      }

      const body = await res.text().catch(() => "");
      const retryable = RETRYABLE_STATUS.has(res.status);
      last = { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}`, retryable };
      // A 4xx won't fix itself — stop immediately rather than burn the quota.
      if (!retryable) break;
    } catch (e) {
      // Network error / DNS failure / AbortSignal timeout — all worth retrying.
      last = { ok: false, error: e instanceof Error ? e.message : String(e), retryable: true };
    }

    if (attempt < MAX_ATTEMPTS) {
      // 300ms, 900ms — brief enough to stay inside a request, long enough to
      // clear a transient blip or a short rate-limit window.
      await new Promise((r) => setTimeout(r, 300 * 3 ** (attempt - 1)));
    }
  }

  return last;
}

/**
 * Send a message. Never throws — returns a Result so the caller decides whether
 * a failure is fatal. Signup, for instance, must not lose an account because
 * the mail provider had a bad minute.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const result =
    serverEnv.EMAIL_PROVIDER === "resend" ? await sendViaResend(msg) : sendViaConsole(msg);

  if (!result.ok) {
    // Recipient is intentionally not logged at info level elsewhere, but a
    // delivery failure is exactly when you need to know who missed their email.
    logger.error("email.send_failed", {
      to: msg.to,
      subject: msg.subject,
      error: result.error,
      retryable: result.retryable,
    });
  }
  return result;
}

// ---- templates -------------------------------------------------------------
// Content lives here; presentation (the branded HTML shell) lives in
// ./templates so both messages stay visually identical for free.

export function verifyEmail(to: string, url: string): EmailMessage {
  const body: EmailBody = {
    preheader: "Confirm your email to activate your TedIS account.",
    heading: "Confirm your email",
    intro: "Welcome to TedIS — the home for people who build in the open. Confirm this address to activate your account.",
    ctaLabel: "Confirm email address",
    ctaUrl: url,
    outro: "This link expires in 24 hours and can only be used once.",
    footnote: "If you didn't sign up for TedIS, you can safely ignore this email — no account will be activated.",
  };
  return {
    to,
    subject: "Confirm your email for TedIS",
    text: `Welcome to TedIS.\n\nConfirm this email address to activate your account:\n${url}\n\nThis link expires in 24 hours and can only be used once.\n\nIf you didn't sign up for TedIS, you can safely ignore this email — no account will be activated.`,
    html: renderEmail(body),
  };
}

export function passwordResetEmail(to: string, url: string): EmailMessage {
  const body: EmailBody = {
    preheader: "Reset your TedIS password.",
    heading: "Reset your password",
    intro: "We received a request to reset the password for your TedIS account.",
    ctaLabel: "Choose a new password",
    ctaUrl: url,
    outro: "This link expires in 1 hour and can only be used once.",
    footnote: "If you didn't request this, you can safely ignore this email — your password won't change.",
  };
  return {
    to,
    subject: "Reset your TedIS password",
    text: `We received a request to reset your password.\n\nReset it here:\n${url}\n\nThis link expires in 1 hour and can only be used once.\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`,
    html: renderEmail(body),
  };
}
