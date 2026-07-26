"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/features/auth/schema";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";

const STATUS_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "That email or password is incorrect.",
  LOCKED: "Too many failed attempts. Your account is locked for 15 minutes.",
  MFA_REQUIRED: "This account requires two-factor authentication.",
};

export default function LoginPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [notice, setNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const login = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      setNotice(null);
      if (result.status === "SUCCESS") {
        await utils.auth.me.invalidate();
        // Server layout routes to /onboarding if the user hasn't finished it.
        router.push("/home");
        router.refresh();
        return;
      }
      setNotice(STATUS_MESSAGES[result.status] ?? "Unable to sign in.");
    },
    onError: (e) => setNotice(e.message),
  });

  return (
    <section className="animate-fade-in">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to your account.</p>
      </div>

      <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <div className="space-y-1.5">
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            error={errors.password?.message}
          />
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
        </div>

        {notice && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {notice}
          </p>
        )}

        <Button type="submit" className="w-full" loading={login.isPending}>
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to TedIS?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
