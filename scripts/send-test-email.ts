/**
 * Sends ONE real email through whatever transport the environment selects, then
 * reports exactly what happened. Use it to prove a Resend setup works before
 * trusting it with a real signup.
 *
 *   pnpm tsx scripts/send-test-email.ts you@example.com
 *
 * Reads EMAIL_PROVIDER / EMAIL_FROM / RESEND_API_KEY from the environment, so
 * it exercises the same configuration the app will use — no special-casing.
 */
import { serverEnv } from "@/config/env";
import { sendEmail, verifyEmail } from "@/server/services/email/email";

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes("@")) {
    console.error("Usage: pnpm tsx scripts/send-test-email.ts <recipient@example.com>");
    process.exitCode = 1;
    return;
  }

  console.log("Configuration");
  console.log(`  EMAIL_PROVIDER : ${serverEnv.EMAIL_PROVIDER}`);
  console.log(`  EMAIL_FROM     : ${serverEnv.EMAIL_FROM ?? "(unset)"}`);
  console.log(`  RESEND_API_KEY : ${serverEnv.RESEND_API_KEY ? "set" : "(unset)"}`);
  console.log(`  APP_URL        : ${serverEnv.APP_URL}`);
  console.log(`  → sending to   : ${to}\n`);

  if (serverEnv.EMAIL_PROVIDER === "console") {
    console.log("⚠ EMAIL_PROVIDER=console — this prints below instead of sending.");
    console.log("  Set EMAIL_PROVIDER=resend to deliver for real.\n");
  }

  // A genuine verification email, so the exact template users receive is what
  // gets exercised — not a simplified stand-in.
  const started = Date.now();
  const result = await sendEmail(
    verifyEmail(to, `${serverEnv.APP_URL}/verify?token=TEST_TOKEN_NOT_VALID`),
  );
  const ms = Date.now() - started;

  if (result.ok) {
    console.log(`\n✓ Accepted by the provider in ${ms}ms.`);
    if (serverEnv.EMAIL_PROVIDER === "resend") {
      console.log("  Check the inbox (and spam). Delivery events are visible in the");
      console.log("  Resend dashboard under Emails.");
      console.log("  NOTE: the link in it is a placeholder and will not verify anything.");
    }
    return;
  }

  console.error(`\n✗ Send failed after ${ms}ms`);
  console.error(`  error     : ${result.error}`);
  console.error(`  retryable : ${result.retryable}`);
  console.error("\nCommon causes:");
  console.error("  401/403 → API key wrong, revoked, or from a different Resend account");
  console.error("  403 + 'domain is not verified' → EMAIL_FROM uses a domain Resend hasn't verified");
  console.error("  422 → recipient not allowed: onboarding@resend.dev only delivers to");
  console.error("        the address your Resend account was created with");
  console.error("  429 → rate limited; the app retries automatically, this script reports it");
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
