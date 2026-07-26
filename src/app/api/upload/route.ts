import { NextResponse } from "next/server";
import { parseCookies } from "@/lib/cookies";
import { SESSION_COOKIE, CSRF_COOKIE, CSRF_HEADER } from "@/features/auth/constants";
import { validateSessionToken } from "@/server/services/auth/session";
import { isTrustedOrigin, validateDoubleSubmit } from "@/server/services/auth/csrf";
import { rateLimit } from "@/server/services/auth/rate-limit";
import { storeUpload } from "@/server/services/media/storage";
import { MAX_VIDEO_BYTES } from "@/features/media/constants";

// Media can be large; allow generous body parsing on this route only.
export const runtime = "nodejs";
export const maxDuration = 60;

const ERROR_STATUS: Record<string, number> = {
  UNSUPPORTED_TYPE: 415,
  TOO_LARGE: 413,
  INVALID_FILE: 400,
};

export async function POST(req: Request) {
  // ---- auth ----
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies.get(SESSION_COOKIE);
  const auth = token ? await validateSessionToken(token) : null;
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ---- CSRF (same-site origin + double-submit) ----
  if (!isTrustedOrigin(req.headers) || !validateDoubleSubmit(cookies.get(CSRF_COOKIE), req.headers.get(CSRF_HEADER))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ---- rate limit (per user) ----
  const rl = await rateLimit(`upload:user:${auth.user.id}`, 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many uploads. Slow down." }, { status: 429 });

  // ---- reject oversized bodies before buffering ----
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_VIDEO_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await storeUpload(buffer, file.type);
  if (!result.ok) {
    const messages: Record<string, string> = {
      UNSUPPORTED_TYPE: "That file type isn't supported.",
      TOO_LARGE: "That file is too large.",
      INVALID_FILE: "That file couldn't be processed.",
    };
    return NextResponse.json({ error: messages[result.error] }, { status: ERROR_STATUS[result.error] ?? 400 });
  }

  return NextResponse.json(result.media);
}
