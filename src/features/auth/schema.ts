import { z } from "zod";

/**
 * Auth validation contracts. Imported by React Hook Form on the client AND by
 * tRPC on the server — one definition, zero drift. Server always re-validates;
 * client validation is purely UX.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address");

// NIST-aligned: favor length, cap to keep argon2 cost bounded, block trivial reuse.
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "That password is too long")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Include at least one letter and one number",
  });

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(30, "At most 30 characters")
  .regex(/^[a-z][a-z0-9_]*$/, "Start with a letter; letters, numbers, _ only");

export const displayNameSchema = z.string().trim().min(1, "Required").max(60);

export const registerSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestPasswordResetSchema = z.object({ email: emailSchema });
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
