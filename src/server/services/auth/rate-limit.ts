import { redis } from "@/server/db/redis";
import { randomToken } from "@/lib/crypto";

/**
 * Sliding-window rate limiter backed by a Redis sorted set (log of hit
 * timestamps). More accurate than fixed windows — no boundary bursts.
 * Every entry auto-expires, so keys are self-cleaning.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetMs: number; // ms until the window frees up
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const redisKey = `rl:${key}`;
  const member = `${now}-${randomToken(6)}`;

  const results = await redis
    .multi()
    .zremrangebyscore(redisKey, 0, now - windowMs)
    .zadd(redisKey, now, member)
    .zcard(redisKey)
    .pexpire(redisKey, windowMs)
    .exec();

  // zcard is the 3rd command (index 2); [err, value] tuples.
  const count = (results?.[2]?.[1] as number | undefined) ?? 0;
  const allowed = count <= limit;

  if (!allowed) {
    // We over-counted this rejected hit; drop it so it doesn't extend the window.
    await redis.zrem(redisKey, member);
  }

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    limit,
    resetMs: windowMs,
  };
}

/**
 * Fixed-window limiter — ~1 Redis command steady-state (INCR; PEXPIRE only on
 * the first hit of a window) versus the sliding-window's ~4. Slightly less
 * precise at window boundaries, but far cheaper — used on the hot paths
 * (every mutation + search) so a free Redis tier isn't drained. The accurate
 * sliding window above is kept for security-sensitive auth flows.
 */
export async function rateLimitFixed(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const windowStart = Math.floor(Date.now() / windowMs);
  const redisKey = `rlf:${key}:${windowStart}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.pexpire(redisKey, windowMs);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit, resetMs: windowMs };
}

/** Named policies so limits live in one place, not scattered magic numbers. */
export const RateLimits = {
  login: { limit: 5, windowMs: 5 * 60_000 }, // 5 / 5min per IP+email
  loginPerIp: { limit: 30, windowMs: 5 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 }, // 5 / hour per IP
  passwordResetRequest: { limit: 3, windowMs: 60 * 60_000 },
  // Token guessing is infeasible (32 random bytes), so this only needs to stop
  // brute-force noise rather than a realistic search.
  verifyEmail: { limit: 20, windowMs: 60 * 60_000 },
  // Tight: each attempt sends a real email, so this caps both spam-to-inbox and
  // provider cost.
  resendVerification: { limit: 3, windowMs: 60 * 60_000 },
} as const;
