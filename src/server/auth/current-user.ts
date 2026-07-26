import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, validateSessionToken, type ValidatedSession } from "@/server/services/auth/session";

/**
 * Resolve the authenticated user inside Server Components / Route Handlers.
 * `cache()` dedupes the session lookup across a single render pass.
 */
export const getServerAuth = cache(async (): Promise<ValidatedSession | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/** Require auth in an RSC; redirects unauthenticated users to /login. */
export async function requireUser(): Promise<ValidatedSession> {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  return auth;
}
