"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";

export default function VerifyPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={<Pending />}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const token = useSearchParams().get("token");
  const verify = trpc.auth.verifyEmail.useMutation();
  // React 18 dev double-invokes effects; the token is single-use, so a second
  // call would consume-then-fail and show an error on a successful verification.
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    verify.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return <Failed reason="This link is missing its token." />;
  if (verify.isPending || verify.isIdle) return <Pending />;
  if (verify.data?.status === "SUCCESS") return <Verified />;
  return <Failed reason="This link is invalid or has expired." />;
}

function Pending() {
  return (
    <section className="animate-fade-in text-center" aria-live="polite">
      <div aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Loader2 size={26} className="animate-spin" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Confirming your email…</h1>
      <p className="mt-2 text-sm text-muted-foreground">This only takes a moment.</p>
    </section>
  );
}

function Verified() {
  return (
    <section className="animate-fade-in text-center" aria-live="polite">
      <div aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
        <CheckCircle2 size={26} />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Email confirmed</h1>
      <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
        Your account is active. Log in to start building in the open.
      </p>
      <Link href="/login" className="mt-6 inline-block w-full">
        <Button className="w-full">Log in</Button>
      </Link>
    </section>
  );
}

/** Terminal failure — offers a fresh link, since expiry is the common cause. */
function Failed({ reason }: { reason: string }) {
  const [email, setEmail] = useState("");
  const resend = trpc.auth.resendVerification.useMutation();

  return (
    <section className="animate-fade-in text-center" aria-live="polite">
      <div aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <XCircle size={26} />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Couldn&rsquo;t confirm</h1>
      <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
        {reason} Links expire after 24 hours and can only be used once.
      </p>

      {resend.isSuccess ? (
        <p className="mt-6 text-sm text-muted-foreground">
          If that address has an unconfirmed account, a new link is on its way.
        </p>
      ) : (
        <form
          className="mt-6 space-y-3 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            resend.mutate({ email });
          }}
          noValidate
        >
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="We'll send a fresh confirmation link."
          />
          <Button type="submit" className="w-full" loading={resend.isPending}>
            Send a new link
          </Button>
          {resend.isError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {resend.error.message || "Couldn't send just now. Try again shortly."}
            </p>
          )}
        </form>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </section>
  );
}
