import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE } from "@/features/auth/constants";

/**
 * Ensures a CSRF token cookie exists on every navigation so the client always
 * has a value to echo in the double-submit header. HttpOnly is intentionally
 * false — the client must read it. The token is unguessable (256-bit).
 *
 * Runs on the Edge runtime, so it uses Web Crypto (not node:crypto) and only
 * imports the dependency-free constants module.
 */
function randomBase64Url(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(CSRF_COOKIE)) {
    res.cookies.set(CSRF_COOKIE, randomBase64Url(32), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  return res;
}

export const config = {
  // Run on pages, not on static assets or the tRPC endpoint itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
