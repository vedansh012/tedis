import argon2 from "argon2";

/**
 * Password hashing. argon2id — memory-hard, resistant to GPU/ASIC cracking.
 * Parameters follow OWASP's Password Storage Cheat Sheet (m=19MiB, t=2, p=1).
 * Bump ALGO_VERSION + params together; verify() transparently re-hashes on login.
 */
export const ALGO_VERSION = 1;

const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

/**
 * A precomputed valid hash of a random string. We verify against this for
 * unknown accounts so login timing does not reveal whether an email exists.
 */
let dummyHash: string | null = null;
export async function getDummyHash(): Promise<string> {
  dummyHash ??= await argon2.hash("tedis-timing-equalizer-" + Math.random(), OPTIONS);
  return dummyHash;
}

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash etc. — treat as non-match, never throw into the auth path.
    return false;
  }
}

/** True when a stored hash was made with weaker params and should be upgraded. */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, OPTIONS);
}
