"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordSchema } from "@/features/auth/schema";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";

const formSchema = z.object({ password: passwordSchema });
type FormInput = z.infer<typeof formSchema>;

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({ resolver: zodResolver(formSchema) });

  const mutation = trpc.auth.resetPassword.useMutation();

  if (!token) {
    return (
      <section className="animate-fade-in space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Invalid link</h1>
        <p className="text-muted-foreground">This reset link is missing or malformed.</p>
        <p className="pt-2 text-sm">
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </p>
      </section>
    );
  }

  if (mutation.isSuccess) {
    return (
      <section aria-live="polite" className="animate-fade-in space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="text-muted-foreground">
          Your password has been changed and other sessions were signed out.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Continue to login
        </Link>
      </section>
    );
  }

  return (
    <section className="animate-fade-in">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Make it strong and unique.</p>
      </div>

      <form
        onSubmit={handleSubmit((d) => mutation.mutate({ token, password: d.password }))}
        className="space-y-4"
        noValidate
      >
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters, with a letter and a number."
          {...register("password")}
          error={errors.password?.message}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {mutation.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Update password
        </Button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
