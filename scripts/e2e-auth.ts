/**
 * End-to-end auth verification against the REAL stack: live Postgres, live Redis,
 * the actual tRPC caller (so CSRF, rate limiting, cookie issuance, and every
 * service run exactly as in production). Run: pnpm tsx scripts/e2e-auth.ts
 *
 * Covers the frictionless flow: instant signup with auto-login, unique
 * email/username, no email verification. Exits non-zero on any failed assertion.
 */
import { createCaller } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { prisma } from "@/server/db/prisma";
import { redis } from "@/server/db/redis";
import { issueToken } from "@/server/services/auth/tokens";
import { validateSessionToken } from "@/server/services/auth/session";
import { parseCookies } from "@/lib/cookies";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}
async function expectThrow(fn: () => Promise<unknown>, includes: string, msg: string) {
  try {
    await fn();
    failed++;
    console.error(`  ✗ ${msg} (expected throw, got success)`);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    assert(m.toLowerCase().includes(includes.toLowerCase()), `${msg} (${m})`);
  }
}

const CSRF = "test-csrf-token-value";
const PW = "Sup3rSecret1";

function makeContext(opts: {
  csrfCookie?: string;
  csrfHeader?: string;
  sessionCookie?: string;
  ip?: string;
  sink: Headers;
}): TRPCContext {
  const cookies = new Map<string, string>();
  if (opts.csrfCookie) cookies.set("tedis_csrf", opts.csrfCookie);
  if (opts.sessionCookie) cookies.set("tedis_session", opts.sessionCookie);

  const headers = new Headers();
  if (opts.csrfHeader) headers.set("x-csrf-token", opts.csrfHeader);
  headers.set("user-agent", "e2e-runner/1.0");

  const resHeaders = opts.sink;
  return {
    req: new Request("http://localhost:3000/api/trpc"),
    resHeaders,
    headers,
    cookies,
    ipAddress: opts.ip ?? "203.0.113.10",
    userAgent: "e2e-runner/1.0",
    auth: null,
    setCookie(name, value, options) {
      const parts = [`${name}=${value}`, `Path=/`, `SameSite=Lax`];
      if (options?.httpOnly ?? true) parts.push("HttpOnly");
      if (options?.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
      resHeaders.append("set-cookie", parts.join("; "));
    },
    clearCookie(name) {
      resHeaders.append("set-cookie", `${name}=; Max-Age=0`);
    },
  } satisfies TRPCContext;
}

async function authedContext(sessionToken: string, sink: Headers): Promise<TRPCContext> {
  const base = makeContext({ csrfCookie: CSRF, csrfHeader: CSRF, sessionCookie: sessionToken, sink });
  base.auth = await validateSessionToken(sessionToken);
  return base;
}

function sessionFromSink(sink: Headers): string | undefined {
  for (const sc of sink.getSetCookie()) {
    const v = parseCookies(sc.split(";")[0]).get("tedis_session");
    if (v) return v;
  }
  return undefined;
}

function caller(sink: Headers, ip: string, csrfHeader: string | undefined = CSRF) {
  return createCaller(makeContext({ csrfCookie: CSRF, csrfHeader, ip, sink }));
}

async function cleanup(emails: string[], usernames: string[]) {
  await prisma.user.deleteMany({ where: { OR: [{ email: { in: emails } }, { username: { in: usernames } }] } });
}

async function main() {
  const EMAILS = {
    happy: "e2e_happy@tedis.test",
    lock: "e2e_lock@tedis.test",
    reset: "e2e_reset@tedis.test",
    dupuser: "e2e_dupuser@tedis.test",
  };
  const USERS = { happy: "e2ehappy", lock: "e2elock", reset: "e2ereset" };
  await cleanup(Object.values(EMAILS), Object.values(USERS));
  const rlKeys = await redis.keys("rl:*e2e*");
  if (rlKeys.length) await redis.del(...rlKeys);

  console.log("\n▶ 1. Instant signup auto-logs-in, no verification, unique email+username");
  let happySession = "";
  {
    const sink = new Headers();
    const res = await caller(sink, "203.0.113.1").auth.register({
      displayName: "Happy Path",
      username: USERS.happy,
      email: EMAILS.happy,
      password: PW,
    });
    assert("status" in res && res.status === "SUCCESS", "register returns SUCCESS (auto-login)");
    happySession = sessionFromSink(sink) ?? "";
    assert(happySession.includes("."), "signup sets a session cookie (auto-login)");

    const user = await prisma.user.findUnique({ where: { email: EMAILS.happy } });
    assert(!!user, "user row created");
    assert(user?.emailVerified !== null, "account active immediately (no verification gate)");
    assert(user?.username === USERS.happy, "chosen username persisted");
    assert(user?.onboardedAt === null, "onboarding still pending (feature preserved)");

    // Duplicate email is rejected.
    await expectThrow(
      () => caller(new Headers(), "203.0.113.1").auth.register({ displayName: "Dup", username: "e2eother", email: EMAILS.happy, password: PW }),
      "already exists",
      "duplicate email is rejected",
    );
    // Duplicate username is rejected.
    await expectThrow(
      () => caller(new Headers(), "203.0.113.1").auth.register({ displayName: "Dup", username: USERS.happy, email: EMAILS.dupuser, password: PW }),
      "taken",
      "duplicate username is rejected",
    );
    const count = await prisma.user.count({ where: { email: EMAILS.happy } });
    assert(count === 1, "no duplicate account created");
  }

  console.log("\n▶ 2. The signup session is valid immediately");
  {
    const sink = new Headers();
    const ctx = await authedContext(happySession, sink);
    const me = await createCaller(ctx).auth.me();
    assert(me?.email === EMAILS.happy, "auth.me works right after signup");
  }

  console.log("\n▶ 3. Login + logout");
  {
    const sink = new Headers();
    const res = await caller(sink, "203.0.113.2").auth.login({ email: EMAILS.happy, password: PW });
    assert("status" in res && res.status === "SUCCESS", "login returns SUCCESS");
    const token = sessionFromSink(sink) ?? "";
    assert((await validateSessionToken(token)) !== null, "login session validates");

    const outSink = new Headers();
    const ctx = await authedContext(token, outSink);
    await createCaller(ctx).auth.logout();
    assert((await validateSessionToken(token)) === null, "session invalid after logout");
  }

  console.log("\n▶ 4. Wrong password / unknown account → INVALID_CREDENTIALS");
  {
    const bad = await caller(new Headers(), "203.0.113.3").auth.login({ email: EMAILS.happy, password: "wrongpassword1" });
    assert("status" in bad && bad.status === "INVALID_CREDENTIALS", "wrong password rejected");
    const unknown = await caller(new Headers(), "203.0.113.3").auth.login({ email: "nobody@nowhere.test", password: "whatever123" });
    assert("status" in unknown && unknown.status === "INVALID_CREDENTIALS", "unknown account rejected (no enumeration on login)");
  }

  console.log("\n▶ 5. CSRF double-submit is enforced on mutations");
  {
    // Cookie present, header MISSING (built directly so no default fills it in).
    const noCsrfCtx = makeContext({ csrfCookie: CSRF, csrfHeader: undefined, ip: "203.0.113.5", sink: new Headers() });
    await expectThrow(
      () => createCaller(noCsrfCtx).auth.login({ email: EMAILS.happy, password: PW }),
      "csrf",
      "mutation without matching CSRF header is FORBIDDEN",
    );
  }

  console.log("\n▶ 6. Account lockout after repeated failures");
  {
    const authService = await import("@/server/services/auth/auth.service");
    await authService.register(
      { displayName: "Lock", username: USERS.lock, email: EMAILS.lock, password: PW },
      { ipAddress: "203.0.113.6" },
    );
    let lockedSeen = false;
    for (let i = 0; i < 11; i++) {
      const r = await authService.login({ email: EMAILS.lock, password: "definitelyWrong1" }, { ipAddress: "203.0.113.6" });
      if (!r.ok && r.error === "LOCKED") lockedSeen = true;
    }
    assert(lockedSeen, "account locks after threshold of failures");
    const stillLocked = await authService.login({ email: EMAILS.lock, password: PW }, { ipAddress: "203.0.113.6" });
    assert(!stillLocked.ok && stillLocked.error === "LOCKED", "correct password refused while locked");
  }

  console.log("\n▶ 7. Password reset rotates password + revokes sessions");
  {
    const authService = await import("@/server/services/auth/auth.service");
    const reg = await authService.register(
      { displayName: "Reset", username: USERS.reset, email: EMAILS.reset, password: "OldPass123" },
      { ipAddress: "203.0.113.7" },
    );
    assert(reg.ok, "reset-user registered");
    const oldSession = reg.ok ? reg.value.sessionToken : "";
    assert((await validateSessionToken(oldSession)) !== null, "pre-reset session valid");

    const userId = (await prisma.user.findUniqueOrThrow({ where: { email: EMAILS.reset }, select: { id: true } })).id;
    const rawReset = await issueToken(userId, "PASSWORD_RESET", EMAILS.reset);
    await caller(new Headers(), "203.0.113.7").auth.resetPassword({ token: rawReset, password: "BrandNew456" });

    assert((await validateSessionToken(oldSession)) === null, "existing sessions revoked after reset");
    const oldLogin = await caller(new Headers(), "203.0.113.7").auth.login({ email: EMAILS.reset, password: "OldPass123" });
    assert("status" in oldLogin && oldLogin.status === "INVALID_CREDENTIALS", "old password no longer works");
    const newLogin = await caller(new Headers(), "203.0.113.7").auth.login({ email: EMAILS.reset, password: "BrandNew456" });
    assert("status" in newLogin && newLogin.status === "SUCCESS", "new password works");
  }

  await cleanup(Object.values(EMAILS), Object.values(USERS));
  console.log(`\n──────────────\nPASS ${passed}  FAIL ${failed}\n`);
  await prisma.$disconnect();
  await redis.quit();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("Fatal:", e);
  await prisma.$disconnect().catch(() => {});
  await redis.quit().catch(() => {});
  process.exit(1);
});
