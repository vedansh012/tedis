"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, MailWarning } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/features/auth/schema";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";

export default function SignupPage() {
  // Set once registration succeeds; the account exists but is inert until the
  // emailed link is opened, so there is nowhere to redirect to yet.
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Signup succeeded but the provider didn't accept the message — the account
  // exists, so we say so plainly and point at resend rather than showing an
  // error the user can't act on.
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const mutation = trpc.auth.register.useMutation({
    onSuccess: (res) => {
      setSentTo(res.email);
      setDeliveryFailed(!res.emailDelivered);
    },
  });

  if (sentTo) return <CheckInbox email={sentTo} deliveryFailed={deliveryFailed} />;

  return (
    <section className="animate-fade-in">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Build in the open. It takes a minute.</p>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4" noValidate>
        <Field
          label="Full name"
          autoComplete="name"
          {...register("displayName")}
          error={errors.displayName?.message}
        />
        <Field
          label="Username"
          autoComplete="username"
          hint="Letters, numbers and underscores. This is your @handle."
          {...register("username")}
          error={errors.username?.message}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters, with a letter and a number."
          {...register("password")}
          error={errors.password?.message}
        />

        {mutation.isError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {mutation.error.message || "Something went wrong. Please try again."}
          </p>
        )}

        <Button type="submit" className="w-full" loading={mutation.isPending || mutation.isSuccess}>
          Create account
        </Button>

        {/*
          Notice-based consent: placed directly above the action it relates to,
          so agreement is tied to the deliberate act of creating the account.
        */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}

/** Post-signup state: the account exists but cannot be used until verified. */
function CheckInbox({ email, deliveryFailed }: { email: string; deliveryFailed: boolean }) {
  const resend = trpc.auth.resendVerification.useMutation();

  return (
    <section className="animate-fade-in text-center">
      <div
        aria-hidden
        className={cn(
          "mx-auto flex size-14 items-center justify-center rounded-2xl",
          deliveryFailed ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary",
        )}
      >
        {deliveryFailed ? <MailWarning size={26} /> : <MailCheck size={26} />}
      </div>

      {deliveryFailed ? (
        <>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Account created</h1>
          <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
            We couldn&rsquo;t send the confirmation email to{" "}
            <span className="font-medium text-foreground">{email}</span> just now. Your account is saved — request a new
            link below.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Confirm your email</h1>
          <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
            We sent a link to <span className="font-medium text-foreground">{email}</span>. Open it to activate your
            account — you won&rsquo;t be able to log in until you do.
          </p>
        </>
      )}

      <div className="mt-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          {deliveryFailed ? "Try again:" : "Didn’t get it? Check spam, then:"}
        </p>
        <Button
          variant="outline"
          onClick={() => resend.mutate({ email })}
          loading={resend.isPending}
          disabled={resend.isSuccess}
          className="w-full"
        >
          {resend.isSuccess ? "Link sent" : "Resend link"}
        </Button>
        {resend.isError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {resend.error.message || "Couldn't resend just now. Try again shortly."}
          </p>
        )}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Already confirmed?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
