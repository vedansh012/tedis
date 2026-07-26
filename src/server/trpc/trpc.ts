import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TRPCContext } from "./context";
import { CSRF_COOKIE, CSRF_HEADER, validateDoubleSubmit, isTrustedOrigin } from "@/server/services/auth/csrf";
import { rateLimitFixed } from "@/server/services/auth/rate-limit";
import { prisma } from "@/server/db/prisma";
import { isStaff } from "@/features/admin/roles";

/**
 * tRPC init. superjson preserves Date/BigInt across the wire. Zod errors are
 * flattened so the client can map them to form fields.
 */
const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zod: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

/**
 * CSRF gate for state-changing calls. Applied to all mutations via
 * `mutationProcedure`. Rejects cross-site origins and any request whose
 * x-csrf-token header doesn't match the tedis_csrf cookie.
 */
const enforceCsrf = t.middleware(({ ctx, type, next }) => {
  if (type === "mutation") {
    if (!isTrustedOrigin(ctx.headers)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cross-site request blocked." });
    }
    const cookie = ctx.cookies.get(CSRF_COOKIE);
    const header = ctx.headers.get(CSRF_HEADER);
    if (!validateDoubleSubmit(cookie, header)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Invalid CSRF token." });
    }
  }
  return next();
});

/** Requires a valid session; narrows ctx.auth to non-null for downstream code. */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }
  return next({ ctx: { ...ctx, auth: ctx.auth } });
});

/**
 * Coarse per-actor write budget on every mutation — a backstop against post/
 * comment/reaction spam and bots. ~2 writes/sec sustained is far above human
 * use but throttles automated abuse. Auth mutations keep their own tighter,
 * purpose-built limits in the auth router (this runs in addition).
 */
const WRITE_LIMIT = { limit: 120, windowMs: 60_000 };
const enforceWriteRateLimit = t.middleware(async ({ ctx, next }) => {
  const actor = ctx.auth?.user.id ?? ctx.ipAddress ?? "anon";
  // Fail-open: a Redis outage must not take down all writes — degrade to
  // "allowed" rather than 500 every mutation.
  let allowed = true;
  try {
    allowed = (await rateLimitFixed(`mut:${actor}`, WRITE_LIMIT.limit, WRITE_LIMIT.windowMs)).allowed;
  } catch {
    allowed = true;
  }
  if (!allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You're doing that too fast — please slow down." });
  }
  return next();
});

/** Per-actor read budget for expensive reads (search) — cheap DoS guard. Fail-open. */
export async function assertReadRateLimit(actor: string, limit = 30, windowMs = 60_000) {
  let allowed = true;
  try {
    allowed = (await rateLimitFixed(`rd:${actor}`, limit, windowMs)).allowed;
  } catch {
    allowed = true;
  }
  if (!allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests — please slow down." });
  }
}

/** Public read/write with CSRF protection (login, register, reset...). */
export const publicMutation = publicProcedure.use(enforceCsrf).use(enforceWriteRateLimit);

/** Authenticated queries. */
export const protectedProcedure = publicProcedure.use(enforceAuth);

/** Authenticated + CSRF-protected mutations, with a spam backstop. */
export const protectedMutation = publicProcedure.use(enforceCsrf).use(enforceAuth).use(enforceWriteRateLimit);

/**
 * Staff-only gate. Re-reads the role from the DB (demotions take effect
 * immediately) and throws NOT_FOUND for non-staff so the admin API surface is
 * indistinguishable from a missing route. Adds `adminRole` to ctx.
 */
const enforceAdmin = t.middleware(async ({ ctx, next }) => {
  const hidden = new TRPCError({ code: "NOT_FOUND", message: "Not found." });
  if (!ctx.auth) throw hidden;
  const me = await prisma.user.findUnique({ where: { id: ctx.auth.user.id }, select: { role: true } });
  if (!me || !isStaff(me.role)) throw hidden;
  // Re-assert auth non-null (and add the verified role) for downstream procedures.
  return next({ ctx: { ...ctx, auth: ctx.auth, adminRole: me.role } });
});

/** Staff-only queries. */
export const adminProcedure = publicProcedure.use(enforceAuth).use(enforceAdmin);

/** Staff-only, CSRF-protected mutations. */
export const adminMutation = publicProcedure.use(enforceCsrf).use(enforceAuth).use(enforceAdmin);
