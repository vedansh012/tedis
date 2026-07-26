/**
 * Client-safe error reporting seam. Logs to the console and forwards to Sentry
 * when the client SDK is active (NEXT_PUBLIC_SENTRY_DSN set). Used by the React
 * error boundaries. Never throws.
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  // Always visible in the console / server logs.
  // eslint-disable-next-line no-console
  console.error("[reportError]", error, context ?? "");

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    void import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error, { extra: context }))
      .catch(() => {});
  }
}
