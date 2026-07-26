/**
 * Next.js server instrumentation. Initializes Sentry only when SENTRY_DSN is
 * set, so this is a complete no-op in dev / before you configure error tracking.
 * Captures unhandled server, RSC, and Route Handler errors via onRequestError.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1, // 10% perf traces; tune per volume/budget
      enabled: true,
    });
  }
}

// Signature matches Next's onRequestError; args are forwarded verbatim to
// Sentry. Loosely typed so the SDK type import stays fully lazy.
export async function onRequestError(...args: unknown[]): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  (Sentry.captureRequestError as (...a: unknown[]) => void)(...args);
}
