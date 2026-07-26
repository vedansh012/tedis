/**
 * Report reasons shared by the client (report dialog) and server (validation).
 * Kept as a small closed set so the moderation queue is filterable and the UI
 * never sends free-form garbage. `details` is optional free text.
 */
export const REPORT_REASONS = [
  { value: "SPAM", label: "Spam or scam" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE", label: "Hate speech or symbols" },
  { value: "VIOLENCE", label: "Violence or threats" },
  { value: "SEXUAL", label: "Nudity or sexual content" },
  { value: "MISINFORMATION", label: "False information" },
  { value: "SELF_HARM", label: "Self-harm or suicide" },
  { value: "OTHER", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value) as [ReportReason, ...ReportReason[]];

/** What can be reported. */
export const REPORT_TARGETS = ["POST", "COMMENT", "PROJECT", "USER"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
