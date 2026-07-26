import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Low-level crypto primitives shared by the auth layer.
 * Kept framework-agnostic and side-effect free.
 */

/** URL-safe random token. 32 bytes = 256 bits of entropy by default. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex digest. Used to store opaque tokens (never the plaintext). */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Constant-time string comparison. Guards against timing side-channels when
 * comparing secrets/tokens. Returns false on length mismatch without leaking it.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still do a comparison to avoid an early-return timing signal.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Numeric one-time codes (e.g. MFA backup codes). Avoids ambiguous chars.
 * Not for passwords.
 */
export function numericCode(digits = 6): string {
  const max = 10 ** digits;
  const n = randomBytes(4).readUInt32BE(0) % max;
  return n.toString().padStart(digits, "0");
}
