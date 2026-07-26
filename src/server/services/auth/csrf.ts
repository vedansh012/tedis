import { serverEnv } from "@/config/env";
import { randomToken, safeEqual } from "@/lib/crypto";
import { CSRF_COOKIE, CSRF_HEADER } from "@/features/auth/constants";

/**
 * CSRF: double-submit token + origin verification.
 *
 * 1. A non-HttpOnly `tedis_csrf` cookie is issued (readable by our JS).
 * 2. The client echoes it in the `x-csrf-token` header on every mutation.
 * 3. The server requires header === cookie (constant-time). A cross-site
 *    attacker can neither read the cookie nor set a custom header (CORS blocks
 *    it), so it can't forge the pair.
 *
 * Origin/Sec-Fetch checks are a defense-in-depth second gate.
 */
export { CSRF_COOKIE, CSRF_HEADER };

export function generateCsrfToken(): string {
  return randomToken(32);
}

export function validateDoubleSubmit(
  cookieValue: string | undefined,
  headerValue: string | null | undefined,
): boolean {
  if (!cookieValue || !headerValue) return false;
  return safeEqual(cookieValue, headerValue);
}

/** True when the request's Origin is same-site (or absent, e.g. same-origin GET). */
export function isTrustedOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const secFetchSite = headers.get("sec-fetch-site");

  // Modern browsers: same-origin/same-site is trusted; cross-site is rejected.
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none";
  }
  // Fallback for clients without Sec-Fetch-Site: compare Origin host to APP_URL.
  if (!origin) return true; // no Origin on same-origin navigations for some methods
  try {
    return new URL(origin).host === new URL(serverEnv.APP_URL).host;
  } catch {
    return false;
  }
}
