import type { TokenType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { randomToken, sha256 } from "@/lib/crypto";

/**
 * One-time tokens for email verification, password reset, and magic links.
 * Only the SHA-256 of the token is stored; the raw value exists briefly to be
 * emailed. Consumption is atomic (single-use) to prevent replay.
 */

export const TokenTtl = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  MAGIC_LINK: 15 * 60 * 1000,
} as const satisfies Record<TokenType, number>;

export async function issueToken(
  userId: string,
  type: TokenType,
  target?: string | null,
): Promise<string> {
  const raw = randomToken(32);
  // Invalidate prior outstanding tokens of the same type for this user.
  await prisma.verificationToken.deleteMany({ where: { userId, type, consumedAt: null } });
  await prisma.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: sha256(raw),
      target: target ?? null,
      expiresAt: new Date(Date.now() + TokenTtl[type]),
    },
  });
  return raw;
}

export interface ConsumedToken {
  userId: string;
  target: string | null;
}

/**
 * Atomically consume a token. Uses updateMany on the (unique) hash with the
 * unconsumed+unexpired predicate so two concurrent requests can't both win.
 */
export async function consumeToken(
  raw: string,
  type: TokenType,
): Promise<ConsumedToken | null> {
  const tokenHash = sha256(raw);
  const now = new Date();

  const updated = await prisma.verificationToken.updateMany({
    where: { tokenHash, type, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });
  if (updated.count !== 1) return null;

  const record = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  return { userId: record.userId, target: record.target };
}
