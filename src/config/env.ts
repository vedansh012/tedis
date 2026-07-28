import { z } from "zod";

/**
 * Environment validation. Imported once at server boot — if anything is
 * missing or malformed, the process refuses to start with a readable error
 * instead of failing mysteriously at runtime deep inside a request.
 *
 * Client-safe values must be prefixed NEXT_PUBLIC_ and read from `clientEnv`.
 */

// In .env files an unset optional is often an empty string rather than absent.
// Coerce "" -> undefined so `.optional()` (and .url()/.email()) behave sanely.
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optionalStr = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url(),
  APP_NAME: z.string().min(1).default("TedIS"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // 48 random bytes base64 ≈ 64 chars. Enforce a floor so weak secrets can't ship.
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be >=32 chars"),
  CSRF_SECRET: z.string().min(32, "CSRF_SECRET must be >=32 chars"),

  WEBAUTHN_RP_ID: z.string().min(1),
  WEBAUTHN_RP_NAME: z.string().min(1),
  WEBAUTHN_ORIGIN: z.string().url(),

  // OAuth / email / storage are optional so early increments boot without them;
  // the features that need them validate presence at their own call sites.
  GOOGLE_CLIENT_ID: optionalStr,
  GOOGLE_CLIENT_SECRET: optionalStr,
  GITHUB_CLIENT_ID: optionalStr,
  GITHUB_CLIENT_SECRET: optionalStr,

  /*
   * Accepts both a bare address and RFC 5322 display-name form
   * (`TedIS <noreply@tedis.uk>`). A plain `.email()` check rejected the latter,
   * which is the form you actually want in production for branded senders.
   */
  EMAIL_FROM: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((v) => /^[^<>]+<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>$/.test(v.trim()) || z.string().email().safeParse(v.trim()).success, {
        message: 'Must be an email address or "Name <email@domain>"',
      })
      .optional(),
  ),
  /*
   * `postmark` was previously accepted here but had no implementation — it fell
   * through to the console transport, so a production deploy set to postmark
   * would have silently dropped every email. Only providers that actually exist
   * are accepted; add the enum value at the same time as the transport, never
   * before.
   */
  EMAIL_PROVIDER: z.enum(["resend", "console"]).default("console"),
  RESEND_API_KEY: optionalStr,

  S3_ENDPOINT: optionalStr,
  S3_REGION: optionalStr,
  S3_BUCKET: optionalStr,
  S3_ACCESS_KEY_ID: optionalStr,
  S3_SECRET_ACCESS_KEY: optionalStr,
  S3_PUBLIC_URL: optionalUrl,

  SENTRY_DSN: optionalStr,
})
  /*
   * Cross-field check: selecting a real provider without its credentials used
   * to fail at the first signup attempt — i.e. in production, on a real user.
   * Boot-time is the right place to find out.
   */
  .refine((e) => e.EMAIL_PROVIDER !== "resend" || !!e.RESEND_API_KEY, {
    path: ["RESEND_API_KEY"],
    message: "Required when EMAIL_PROVIDER=resend",
  })
  .refine((e) => e.EMAIL_PROVIDER !== "resend" || !!e.EMAIL_FROM, {
    path: ["EMAIL_FROM"],
    message: "Required when EMAIL_PROVIDER=resend (e.g. \"TedIS <noreply@yourdomain.com>\")",
  });

/** Guard so we never accidentally parse server env on the client bundle. */
function loadServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv accessed on the client — use clientEnv instead.");
  }
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export type ServerEnv = z.infer<typeof serverSchema>;

// Lazily memoized so importing this module in a client component (for types)
// doesn't blow up until something actually reads a value.
let cached: ServerEnv | null = null;
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_t, key: string) {
    cached ??= loadServerEnv();
    return cached[key as keyof ServerEnv];
  },
});

export const isProd = process.env.NODE_ENV === "production";
export const isDev = process.env.NODE_ENV === "development";

/** Values safe to expose to the browser. */
export const clientEnv = {
  APP_NAME: process.env.APP_NAME ?? "TedIS",
} as const;
