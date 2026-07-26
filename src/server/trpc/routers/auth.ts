import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, publicMutation, protectedProcedure, protectedMutation } from "../trpc";
import {
  registerSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/features/auth/schema";
import * as auth from "@/server/services/auth/auth.service";
import { SESSION_COOKIE, invalidateSession, listUserSessions } from "@/server/services/auth/session";
import { CSRF_COOKIE, generateCsrfToken } from "@/server/services/auth/csrf";
import { rateLimit, RateLimits } from "@/server/services/auth/rate-limit";
import { prisma } from "@/server/db/prisma";
import type { TRPCContext } from "../context";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // seconds; server enforces sliding expiry

/** Set the session cookie and rotate the CSRF token (prevents fixation). */
function establishSession(ctx: TRPCContext, token: string) {
  ctx.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    maxAgeSeconds: SESSION_MAX_AGE,
  });
  ctx.setCookie(CSRF_COOKIE, generateCsrfToken(), {
    httpOnly: false, // must be readable by client JS for double-submit
    sameSite: "Lax",
    maxAgeSeconds: SESSION_MAX_AGE,
  });
}

async function limitOrThrow(key: string, policy: { limit: number; windowMs: number }) {
  const res = await rateLimit(key, policy.limit, policy.windowMs);
  if (!res.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please wait a few minutes and try again.",
    });
  }
}

export const authRouter = router({
  // ---- register (instant, auto-login, no email verification) -------------
  register: publicMutation.input(registerSchema).mutation(async ({ ctx, input }) => {
    await limitOrThrow(`register:ip:${ctx.ipAddress ?? "unknown"}`, RateLimits.register);
    const result = await auth.register(input, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
    if (!result.ok) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          result.error === "EMAIL_TAKEN"
            ? "An account with this email already exists."
            : "That username is already taken.",
      });
    }
    // Log the new user straight in.
    establishSession(ctx, result.value.sessionToken);
    return { status: "SUCCESS" as const, user: result.value.user };
  }),

  // ---- login -------------------------------------------------------------
  login: publicMutation.input(loginSchema).mutation(async ({ ctx, input }) => {
    await limitOrThrow(`login:ip:${ctx.ipAddress ?? "unknown"}`, RateLimits.loginPerIp);
    await limitOrThrow(`login:acct:${input.email}`, RateLimits.login);

    const result = await auth.login(input, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
    if (result.ok) {
      establishSession(ctx, result.value.sessionToken);
      return { status: "SUCCESS" as const, user: result.value.user, newDevice: result.value.newDevice };
    }
    return { status: result.error };
  }),

  // ---- logout ------------------------------------------------------------
  logout: protectedMutation.mutation(async ({ ctx }) => {
    await auth.logout(ctx.auth.session.id, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
    ctx.clearCookie(SESSION_COOKIE);
    return { ok: true as const };
  }),

  // ---- current user ------------------------------------------------------
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.auth) return null;
    const { user } = ctx.auth;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      emailVerified: user.emailVerified !== null,
      mfaEnabled: user.mfaEnabled,
    };
  }),

  // ---- password reset ----------------------------------------------------
  requestPasswordReset: publicMutation
    .input(requestPasswordResetSchema)
    .mutation(async ({ ctx, input }) => {
      await limitOrThrow(`pwreset:ip:${ctx.ipAddress ?? "unknown"}`, RateLimits.passwordResetRequest);
      await auth.requestPasswordReset(input.email);
      return { ok: true as const, message: "If an account exists for that email, a reset link has been sent." };
    }),

  resetPassword: publicMutation.input(resetPasswordSchema).mutation(async ({ ctx, input }) => {
    const result = await auth.resetPassword(input.token, input.password, {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    if (!result.ok) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
    }
    return { ok: true as const };
  }),

  // ---- session & device management --------------------------------------
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await listUserSessions(ctx.auth.user.id);
    return sessions.map((s) => ({
      id: s.id,
      current: s.id === ctx.auth.session.id,
      ipAddress: s.ipAddress,
      device: s.device?.name ?? null,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
    }));
  }),

  revokeSession: protectedMutation
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Ownership check: only revoke sessions belonging to the caller.
      const target = await prisma.session.findUnique({
        where: { id: input.sessionId },
        select: { userId: true },
      });
      if (!target || target.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }
      await invalidateSession(input.sessionId);
      if (input.sessionId === ctx.auth.session.id) ctx.clearCookie(SESSION_COOKIE);
      return { ok: true as const };
    }),

  loginHistory: protectedProcedure.query(async ({ ctx }) => {
    const events = await prisma.loginEvent.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, ipAddress: true, userAgent: true, reason: true, createdAt: true },
    });
    return events;
  }),
});
