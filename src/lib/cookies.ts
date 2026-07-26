/**
 * Dependency-free cookie helpers. We control every attribute explicitly so
 * security posture (HttpOnly, Secure, SameSite) is never left to a library default.
 */
import { isProd } from "@/config/env";

export interface CookieOptions {
  maxAgeSeconds?: number;
  httpOnly?: boolean;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
  expires?: Date;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly ?? true) parts.push("HttpOnly");
  if (opts.secure ?? isProd) parts.push("Secure");
  if (opts.maxAgeSeconds !== undefined) parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  return parts.join("; ");
}

/** Parse a Cookie header into a map. Tolerant of malformed pairs. */
export function parseCookies(header: string | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) map.set(key, decodeURIComponent(val));
  }
  return map;
}
