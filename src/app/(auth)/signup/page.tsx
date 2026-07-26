"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/features/auth/schema";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";

export default function SignupPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  // Instant signup: the account is created and the user is logged in server-side
  // (session cookie set), then sent straight into the app.
  const mutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      router.push("/home");
      router.refresh();
    },
  });

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
