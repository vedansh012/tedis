"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/observability";

/** Route-level error boundary. Keeps the shell; offers retry + a way home. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-2xl">⚠️</div>
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        An unexpected error occurred. You can try again — if it keeps happening, we&rsquo;re on it.
      </p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-muted-foreground">ref: {error.digest}</p>}
      <div className="mt-5 flex items-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/home">
          <Button variant="outline">Back to feed</Button>
        </Link>
      </div>
    </div>
  );
}
