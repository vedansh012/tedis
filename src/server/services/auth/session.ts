import type { Session, User } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { randomToken, sha256, safeEqual } from "@/lib/crypto";
import { SESSION_COOKIE } from "@/features/auth/constants";

/**
 * Opaque, DB-backed sessions.
 *
 * The token handed to the client is `${sessionId}.${secret}`. We persist only
 * sha256(secret). So a DB leak cannot be used to forge sessions, and a stolen
 * cookie can be revoked server-side instantly (unlike stateless JWTs).
 *
 * Sliding expiry keeps active users logged in; absoluteExpiresAt caps total
 * lifetime so a leaked-but-active cookie can't live forever.
 */

export { SESSION_COOKIE };
const SLIDING_MS = 7 * 24 * 60 * 60 * 1000; // 7d idle window
const ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000; // 30d hard cap
const SECRET_BYTES = 24;

export interface SessionContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  mfaSatisfied?: boolean;
}

export async function createSession(
  userId: string,
  ctx: SessionContext = {},
): Promise<{ token: string; session: Session }> {
  const secret = randomToken(SECRET_BYTES);
  const now = Date.now();
  const session = await prisma.session.create({
    data: {
      userId,
      hashedSecret: sha256(secret),
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      deviceId: ctx.deviceId ?? null,
      mfaSatisfied: ctx.mfaSatisfied ?? false,
      expiresAt: new Date(now + SLIDING_MS),
      absoluteExpiresAt: new Date(now + ABSOLUTE_MS),
    },
  });
  return { token: `${session.id}.${secret}`, session };
}

export interface ValidatedSession {
  session: Session;
  user: User;
}

/**
 * Validate a raw cookie token. Returns null for any failure (missing, expired,
 * revoked, tampered) without distinguishing them to the caller.
 */
export async function validateSessionToken(token: string): Promise<ValidatedSession | null> {
  const sep = token.indexOf(".");
  if (sep <= 0) return null;
  const id = token.slice(0, sep);
  const secret = token.slice(sep + 1);
  if (!secret) return null;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  const invalid =
    session.revokedAt !== null ||
    session.expiresAt.getTime() < now ||
    session.absoluteExpiresAt.getTime() < now ||
    session.user.deletedAt !== null ||
    session.user.status !== "ACTIVE";

  if (invalid) {
    // Opportunistic cleanup of dead rows; ignore races.
    if (session.expiresAt.getTime() < now || session.absoluteExpiresAt.getTime() < now) {
      await prisma.session.deleteMany({ where: { id } }).catch(() => {});
    }
    return null;
  }

  // Constant-time secret check.
  if (!safeEqual(session.hashedSecret, sha256(secret))) return null;

  // Sliding refresh: extend once we're past the halfway idle mark, capped by absolute.
  let refreshed = session;
  if (now > session.expiresAt.getTime() - SLIDING_MS / 2) {
    const nextExpiry = Math.min(now + SLIDING_MS, session.absoluteExpiresAt.getTime());
    refreshed = await prisma.session.update({
      where: { id },
      data: { expiresAt: new Date(nextExpiry), lastActiveAt: new Date(now) },
      include: { user: true },
    });
  } else {
    // Cheap heartbeat without rewriting expiry on every request.
    await prisma.session
      .update({ where: { id }, data: { lastActiveAt: new Date(now) } })
      .catch(() => {});
  }

  return { session: refreshed, user: session.user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every session for a user, optionally sparing the current one. */
export async function invalidateUserSessions(userId: string, exceptId?: string): Promise<number> {
  const res = await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

export function listUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastActiveAt: "desc" },
    include: { device: true },
  });
}

/** Mark a session as having satisfied an MFA step-up. */
export async function markMfaSatisfied(sessionId: string): Promise<void> {
  await prisma.session.update({ where: { id: sessionId }, data: { mfaSatisfied: true } });
}
