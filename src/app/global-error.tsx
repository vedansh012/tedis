"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/observability";

/**
 * Root error boundary — catches errors in the root layout itself, so it must
 * render its own <html>/<body>. Deliberately dependency-free and inline-styled
 * (the app's CSS may not have loaded when this fires).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest, scope: "global" });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#0d0f14", color: "#e6e9ef" }}>
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 420 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#9aa1ad", fontSize: 14, marginTop: 8 }}>
            The app hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 20, padding: "0.55rem 1.1rem", borderRadius: 8, border: "none", background: "#E85D00", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
