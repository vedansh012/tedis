import type { User } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { serverEnv } from "@/config/env";
import { ok, err, type Result } from "@/lib/result";
import { randomToken } from "@/lib/crypto";
import { hashPassword, verifyPassword, needsRehash, getDummyHash, ALGO_VERSION } from "./password";
import { createSession, invalidateSession } from "./session";
import { issueToken, consumeToken } from "./tokens";
import { upsertDevice } from "./devices";
import { writeAudit } from "@/server/services/audit/audit";
import { sendEmail, passwordResetEmail } from "@/server/services/email/email";

/**
 * Auth orchestration. Pure of transport concerns — it receives request context
 * (ip/ua) as data and returns Results + an optional session token for the
 * caller to place in a cookie. Rate limiting (IP-scoped) lives in the router.
 */

const LOCK_THRESHOLD = 10;
const LOCK_MS = 15 * 60 * 1000;

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ---- helpers ---------------------------------------------------------------

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return /^[a-z]/.test(base) ? base : `user${base}`;
}

async function generateUniqueUsername(displayName: string): Promise<string> {
  const base = slugifyName(displayName) || "user";
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}${randomToken(3).replace(/[^a-z0-9]/gi, "").slice(0, 4)}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `user${randomToken(6).replace(/[^a-z0-9]/gi, "").slice(0, 8)}`;
}

async function recordLogin(
  type: Parameters<typeof prisma.loginEvent.create>[0]["data"]["type"],
  userId: string | null,
  meta: RequestMeta,
  reason?: string,
) {
  await prisma.loginEvent
    .create({
      data: {
        userId,
        type,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        reason: reason ?? null,
      },
    })
    .catch(() => {});
}

// ---- register --------------------------------------------------------------

export type RegisterError = "EMAIL_TAKEN" | "USERNAME_TAKEN";

export interface AuthSuccess {
  user: Pick<User, "id" | "username" | "displayName" | "email">;
  sessionToken: string;
  newDevice: boolean;
}

/**
 * Frictionless registration: creates the account and logs the user in
 * immediately (no email verification). Accounts are usable the instant they're
 * created. The caller places the returned session token in a cookie.
 */
export async function register(
  input: { email: string; password: string; displayName: string; username?: string },
  meta: RequestMeta,
): Promise<Result<AuthSuccess, RegisterError>> {
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existingEmail) return err("EMAIL_TAKEN");

  let username = input.username?.trim().toLowerCase();
  if (username) {
    const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (taken) return err("USERNAME_TAKEN");
  } else {
    username = await generateUniqueUsername(input.displayName);
  }

  const hash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username,
      displayName: input.displayName,
      // No verification step — the account is active immediately.
      emailVerified: new Date(),
      password: { create: { hash, algoVersion: ALGO_VERSION } },
      profile: { create: {} },
    },
    select: { id: true, username: true, displayName: true, email: true },
  });

  const device = await upsertDevice(user.id, meta.userAgent, meta.ipAddress);
  const { token } = await createSession(user.id, {
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    deviceId: device.id,
  });

  await recordLogin("LOGIN_SUCCESS", user.id, meta);
  await writeAudit({
    actorId: user.id,
    action: "auth.register",
    targetType: "USER",
    targetId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return ok({ user, sessionToken: token, newDevice: device.isNew });
}

// ---- login -----------------------------------------------------------------

export type LoginError = "INVALID_CREDENTIALS" | "LOCKED" | "MFA_REQUIRED";

export type LoginSuccess = AuthSuccess;

export async function login(
  input: { email: string; password: string },
  meta: RequestMeta,
): Promise<Result<LoginSuccess, LoginError>> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { password: true },
  });

  // Constant-time: always run an argon2 verify, even for unknown accounts.
  if (!user || !user.password || user.deletedAt || user.status !== "ACTIVE") {
    await verifyPassword(await getDummyHash(), input.password);
    await recordLogin("LOGIN_FAILURE", user?.id ?? null, meta, "unknown_or_inactive");
    return err("INVALID_CREDENTIALS");
  }

  // Lockout gate.
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await recordLogin("LOCKED_OUT", user.id, meta, "locked");
    return err("LOCKED");
  }

  const valid = await verifyPassword(user.password.hash, input.password);
  if (!valid) {
    const failed = user.failedLogins + 1;
    const lock = failed >= LOCK_THRESHOLD;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MS) : user.lockedUntil,
      },
    });
    await recordLogin("LOGIN_FAILURE", user.id, meta, "bad_password");
    if (lock) {
      await writeAudit({ actorId: user.id, action: "auth.account.locked", targetId: user.id, ipAddress: meta.ipAddress });
      return err("LOCKED");
    }
    return err("INVALID_CREDENTIALS");
  }

  // Correct password below this line. (Email verification has been removed —
  // accounts are usable immediately after signup.)

  // Reset failure counters on any successful auth.
  const resets: Record<string, unknown> = {};
  if (user.failedLogins !== 0 || user.lockedUntil) {
    resets.failedLogins = 0;
    resets.lockedUntil = null;
  }
  // Transparent password upgrade if params strengthened since last hash.
  if (needsRehash(user.password.hash)) {
    const newHash = await hashPassword(input.password);
    await prisma.passwordCredential.update({
      where: { userId: user.id },
      data: { hash: newHash, algoVersion: ALGO_VERSION },
    });
  }
  if (Object.keys(resets).length) {
    await prisma.user.update({ where: { id: user.id }, data: resets });
  }

  const device = await upsertDevice(user.id, meta.userAgent, meta.ipAddress);

  // MFA step-up (fully wired in Increment 3; dormant while mfaEnabled=false).
  if (user.mfaEnabled) {
    await recordLogin("MFA_CHALLENGE", user.id, meta);
    return err("MFA_REQUIRED");
  }

  const { token } = await createSession(user.id, {
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    deviceId: device.id,
    mfaSatisfied: false,
  });

  await recordLogin("LOGIN_SUCCESS", user.id, meta);
  await writeAudit({ actorId: user.id, action: "auth.login.success", targetId: user.id, ipAddress: meta.ipAddress, userAgent: meta.userAgent });

  return ok({
    user: { id: user.id, username: user.username, displayName: user.displayName, email: user.email },
    sessionToken: token,
    newDevice: device.isNew,
  });
}

// ---- logout ----------------------------------------------------------------

export async function logout(sessionId: string, meta: RequestMeta): Promise<void> {
  await invalidateSession(sessionId);
  await recordLogin("LOGOUT", null, meta);
}

// ---- password reset --------------------------------------------------------

/** Always returns void — never reveals whether the email exists. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const raw = await issueToken(user.id, "PASSWORD_RESET", email);
  await sendEmail(passwordResetEmail(email, `${serverEnv.APP_URL}/reset-password?token=${raw}`));
  await writeAudit({ actorId: user.id, action: "auth.password.reset_requested", targetId: user.id });
}

export type ResetPasswordResult = Result<{ userId: string }, "INVALID_TOKEN">;

export async function resetPassword(
  token: string,
  newPassword: string,
  meta: RequestMeta,
): Promise<ResetPasswordResult> {
  const consumed = await consumeToken(token, "PASSWORD_RESET");
  if (!consumed) return err("INVALID_TOKEN");

  const hash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.passwordCredential.upsert({
      where: { userId: consumed.userId },
      create: { userId: consumed.userId, hash, algoVersion: ALGO_VERSION },
      update: { hash, algoVersion: ALGO_VERSION },
    }),
    // Reset lockout + verify email (a reset proves inbox control).
    prisma.user.update({
      where: { id: consumed.userId },
      data: { failedLogins: 0, lockedUntil: null, emailVerified: new Date() },
    }),
    // Security best practice: invalidate all existing sessions on password change.
    prisma.session.updateMany({
      where: { userId: consumed.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordLogin("PASSWORD_RESET", consumed.userId, meta);
  await writeAudit({ actorId: consumed.userId, action: "auth.password.reset", targetId: consumed.userId, ipAddress: meta.ipAddress });
  return ok({ userId: consumed.userId });
}
