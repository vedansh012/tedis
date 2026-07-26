/**
 * Client-side error tracking. Runs once on app startup. No-op unless
 * NEXT_PUBLIC_SENTRY_DSN is set (Sentry DSNs are safe to expose publicly).
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Enables Sentry to track client-side navigations in the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
