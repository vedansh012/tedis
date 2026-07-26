"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/features/auth/schema";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  const mutation = trpc.auth.requestPasswordReset.useMutation();

  if (mutation.isSuccess) {
    return (
      <section aria-live="polite" className="animate-fade-in space-y-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-pretty text-muted-foreground">{mutation.data.message}</p>
        <p className="pt-2 text-sm">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="animate-fade-in">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&rsquo;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          {...register("email")}
          error={errors.email?.message}
        />
        {mutation.isError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {mutation.error.message}
          </p>
        )}
        <Button type="submit" className="w-full" loading={mutation.isPending}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </section>
  );
}
