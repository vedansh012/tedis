/**
 * Single source of truth for the legal pages (/terms, /privacy, /cookies).
 *
 * ⚠️ FILL THESE IN BEFORE PUBLIC LAUNCH. The placeholders below are marked with
 * `TODO` and are rendered verbatim, so anything left unset is visible on the
 * live site — that is deliberate, so a missing value can't slip past unnoticed.
 *
 * ⚠️ These documents were drafted to describe what the code actually does, but
 * they are NOT legal advice and have not been reviewed by a lawyer. Have them
 * reviewed before accepting real users, especially with EU/UK users in scope.
 */

export const legal = {
  /** Legal entity or individual operating the service. */
  entityName: "Vedansh",

  /** Where the operator is established — determines governing law. */
  jurisdiction: "Himachal Pradesh, India",
  governingLaw: "the laws of India",

  /** Postal address. Required by GDPR Art. 13 for the controller identity. */
  address: "NIT Hamirpur, Hamirpur, Himachal Pradesh, India",

  /** Contact addresses. A privacy contact is legally required in the EU/UK. */
  contactEmail: "tedisorg@gmail.com",
  privacyEmail: "tedisorg@gmail.com",

  /**
   * Minimum age to hold an account.
   *
   * Held at 13 pending confirmation. India's DPDP Act 2023 treats everyone under
   * 18 as a child requiring verifiable parental consent; COPPA (US) sets 13; the
   * EU/UK set 13–16 depending on member state. 13 is the lowest figure any major
   * regime permits without a parental-consent mechanism, which TedIS does not have.
   */
  minimumAge: 13,

  /**
   * Last substantive revision. Bump whenever the terms materially change —
   * users are told to check this date.
   */
  lastUpdated: "2026-07-27",

  /**
   * Sub-processors that receive user data. Keep in sync with what is actually
   * provisioned — an inaccurate list is worse than none.
   */
  processors: [
    { name: "Railway", purpose: "Application hosting", data: "All request data in transit" },
    { name: "Neon", purpose: "Managed PostgreSQL database", data: "Account, profile, posts, messages" },
    { name: "Upstash", purpose: "Redis — sessions, rate limits, realtime", data: "Session identifiers, presence" },
    { name: "Cloudflare", purpose: "DNS, CDN, R2 object storage", data: "Uploaded images and video, request metadata" },
    { name: "Resend", purpose: "Transactional email (password reset)", data: "Email address" },
    { name: "Sentry", purpose: "Error monitoring", data: "Error traces, which may include IP address" },
  ],
} as const;

/** True when every placeholder has been replaced — used by the launch check. */
export function legalConfigComplete(): boolean {
  return !JSON.stringify(legal).includes("TODO");
}
