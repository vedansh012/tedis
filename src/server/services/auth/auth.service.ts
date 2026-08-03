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
import {
  sendEmail,
  passwordResetEmail,
  verifyEmail as verifyEmailTemplate,
  type SendResult,
} from "@/server/services/email/email";
import { logger } from "@/server/lib/logger";

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

/** Registration no longer returns a session — the account is inert until verified. */
export interface RegisterSuccess {
  user: Pick<User, "id" | "username" | "displayName" | "email">;
  /**
   * False when the account was created but the verification email could not be
   * delivered. The signup is still valid — the caller should tell the user to
   * use "resend" rather than pretend nothing happened.
   */
  emailDelivered: boolean;
}

/**
 * Registration with mandatory email verification.
 *
 * The account is created but left UNVERIFIED (`emailVerified: null`) and no
 * session is issued, so `login()` will refuse it until the emailed link is
 * consumed. This is what makes the address provably reachable: it is the only
 * account-recovery channel, so an unverified (or fake) address would mean a
 * permanently unrecoverable account.
 */
export async function register(
  input: { email: string; password: string; displayName: string; username?: string },
  meta: RequestMeta,
): Promise<Result<RegisterSuccess, RegisterError>> {
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
      // Stays null until the emailed link is consumed; login() enforces this.
      emailVerified: null,
      password: { create: { hash, algoVersion: ALGO_VERSION } },
      profile: { create: {} },
    },
    select: { id: true, username: true, displayName: true, email: true },
  });

  /*
   * Delivery is deliberately NOT fatal here. The user row is already committed,
   * so throwing would leave an account that exists but whose owner was told
   * signup failed — and their retry would hit EMAIL_TAKEN, locking them out of
   * their own address permanently. The token is issued regardless, so "resend"
   * works even when this first attempt didn't.
   */
  const delivery = await sendVerificationLink(user.id, user.email);
  if (!delivery.ok) {
    logger.error("auth.register.verification_email_failed", {
      userId: user.id,
      error: delivery.error,
      retryable: delivery.retryable,
    });
  }

  await writeAudit({
    actorId: user.id,
    action: "auth.register",
    targetType: "USER",
    targetId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return ok({ user, emailDelivered: delivery.ok });
}

// ---- email verification ----------------------------------------------------

/** Issues a fresh verification token and emails the link. Never throws. */
async function sendVerificationLink(userId: string, email: string): Promise<SendResult> {
  const raw = await issueToken(userId, "EMAIL_VERIFICATION", email);
  const url = `${serverEnv.APP_URL}/verify?token=${encodeURIComponent(raw)}`;
  return sendEmail(verifyEmailTemplate(email, url));
}

export type VerifyEmailError = "INVALID_OR_EXPIRED";

/**
 * Consumes a verification token and activates the account. Idempotent in
 * effect: the token is single-use, so a replayed link fails closed.
 */
export async function verifyEmail(
  rawToken: string,
  meta: RequestMeta,
): Promise<Result<{ email: string }, VerifyEmailError>> {
  const consumed = await consumeToken(rawToken, "EMAIL_VERIFICATION");
  if (!consumed) return err("INVALID_OR_EXPIRED");

  const user = await prisma.user.update({
    where: { id: consumed.userId },
    data: { emailVerified: new Date() },
    select: { id: true, email: true },
  });

  await writeAudit({
    actorId: user.id,
    action: "auth.email.verified",
    targetType: "USER",
    targetId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  return ok({ email: user.email });
}

/**
 * Re-sends the verification link. Always resolves without revealing whether the
 * address exists or is already verified — the same non-enumeration stance the
 * password-reset flow takes.
 */
export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerified: true, deletedAt: true, status: true },
  });
  if (!user || user.deletedAt || user.status !== "ACTIVE" || user.emailVerified) return;
  /*
   * Failures are swallowed on purpose. An unknown address returns above without
   * sending; if a *known* address surfaced its delivery error, the caller would
   * see 200-vs-500 and could enumerate registered emails. The failure is logged
   * inside sendEmail, which is where operators need it.
   */
  await sendVerificationLink(user.id, user.email);
}

// ---- login -----------------------------------------------------------------

export type LoginError = "INVALID_CREDENTIALS" | "LOCKED" | "MFA_REQUIRED" | "UNVERIFIED";

export type LoginSuccess = AuthSuccess;

export async function login(
  input: { identifier: string; password: string },
  meta: RequestMeta,
): Promise<Result<LoginSuccess, LoginError>> {
  // Email vs username is decided purely by the presence of "@" — both columns
  // are @db.Citext so lookups are case-insensitive without extra work.
  const isEmail = input.identifier.includes("@");
  const user = await prisma.user.findUnique({
    where: isEmail ? { email: input.identifier } : { username: input.identifier },
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

  // Correct password below this line.

  /*
   * Verification gate. Checked only after the password is confirmed correct, so
   * an attacker cannot use this response to discover which addresses are
   * registered — a wrong password still returns INVALID_CREDENTIALS. No session
   * is issued; the caller offers to re-send the link.
   */
  if (user.emailVerified === null) {
    await recordLogin("LOGIN_FAILURE", user.id, meta, "email_unverified");
    return err("UNVERIFIED");
  }

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

/**
 * Always returns void — never reveals whether the email exists. That holds even
 * when the provider is failing: `sendEmail` returns a Result rather than
 * throwing, so a known-but-undeliverable address is indistinguishable from an
 * unknown one. The delivery error is logged inside sendEmail.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const raw = await issueToken(user.id, "PASSWORD_RESET", email);
  const url = `${serverEnv.APP_URL}/reset-password?token=${encodeURIComponent(raw)}`;
  await sendEmail(passwordResetEmail(email, url));
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
