import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Session, User } from "@prisma/client";
import { parseCookies, serializeCookie, type CookieOptions } from "@/lib/cookies";
import { SESSION_COOKIE, validateSessionToken } from "@/server/services/auth/session";

/**
 * Per-request context. Resolves the authenticated session eagerly (one indexed
 * lookup) and exposes cookie read/write plus request metadata. Mutations that
 * set cookies (login/logout) append Set-Cookie to `resHeaders`.
 */
export interface AuthState {
  user: User;
  session: Session;
}

function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const { req, resHeaders } = opts;
  const cookies = parseCookies(req.headers.get("cookie"));

  const sessionToken = cookies.get(SESSION_COOKIE);
  const auth: AuthState | null = sessionToken
    ? await validateSessionToken(sessionToken)
    : null;

  return {
    req,
    resHeaders,
    headers: req.headers,
    cookies,
    ipAddress: clientIp(req.headers),
    userAgent: req.headers.get("user-agent"),
    auth,
    setCookie(name: string, value: string, options?: CookieOptions) {
      resHeaders.append("set-cookie", serializeCookie(name, value, options));
    },
    clearCookie(name: string) {
      resHeaders.append("set-cookie", serializeCookie(name, "", { maxAgeSeconds: 0 }));
    },
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
