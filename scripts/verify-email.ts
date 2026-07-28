/**
 * Email-hardening verification against the real service layer.
 *
 * Points EMAIL_PROVIDER at a fake Resend by stubbing global fetch, so every
 * provider failure mode can be exercised for real: downtime, rate limiting,
 * hard 4xx, and timeouts. Exits non-zero on any failed assertion.
 *
 *   pnpm tsx scripts/verify-email.ts
 */
/*
 * NOTE: nothing here is imported statically. `config/env.ts` memoizes the parsed
 * environment on first access, and importing prisma/redis touches it — so a
 * static import would freeze EMAIL_PROVIDER at whatever .env says (console)
 * before this script could switch it to `resend`. Every import is therefore
 * deferred until after the overrides below are applied.
 */
type Prisma = typeof import("@/server/db/prisma")["prisma"];
type Redis = typeof import("@/server/db/redis")["redis"];
let prisma: Prisma;
let redis: Redis;

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

const EMAILS = {
  down: "email_down@tedis.test",
  ratelimit: "email_rl@tedis.test",
  ok: "email_ok@tedis.test",
  enum: "email_enum@tedis.test",
};

/** Swap global fetch for a scripted Resend. Returns a call counter + restore fn. */
function stubResend(handler: (attempt: number) => Response | Promise<Response> | never) {
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("api.resend.com")) {
      calls++;
      return handler(calls);
    }
    return real(input as RequestInfo, init);
  }) as typeof fetch;
  return { calls: () => calls, restore: () => { globalThis.fetch = real; } };
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: Object.values(EMAILS) } } });
  const keys = await redis.keys("rl:*198.51.100.*");
  if (keys.length) await redis.del(...keys);
}

async function main() {
  // Must happen before ANY module that reads serverEnv is imported.
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "re_test_fake_key";
  process.env.EMAIL_FROM = "TedIS <noreply@tedis.test>";

  ({ prisma } = await import("@/server/db/prisma"));
  ({ redis } = await import("@/server/db/redis"));
  const auth = await import("@/server/services/auth/auth.service");
  const { sendEmail, verifyEmail: verifyTpl } = await import("@/server/services/email/email");

  // Guard: if the transport didn't actually switch, every assertion below would
  // silently pass against the console transport and prove nothing.
  const { serverEnv } = await import("@/config/env");
  if (serverEnv.EMAIL_PROVIDER !== "resend") {
    throw new Error(`Expected EMAIL_PROVIDER=resend, got "${serverEnv.EMAIL_PROVIDER}" — env was cached too early.`);
  }

  await cleanup();

  console.log("\n▶ 1. Provider completely down → account still created");
  {
    const stub = stubResend(() => { throw new Error("ECONNREFUSED"); });
    const res = await auth.register(
      { displayName: "Down", username: "emaildown", email: EMAILS.down, password: "Sup3rSecret1" },
      { ipAddress: "198.51.100.1" },
    );
    stub.restore();

    assert(res.ok, "register() succeeds despite provider being unreachable");
    assert(res.ok && res.value.emailDelivered === false, "emailDelivered=false is reported to the caller");
    const user = await prisma.user.findUnique({ where: { email: EMAILS.down }, select: { id: true } });
    assert(!!user, "account row was committed (user is NOT locked out of their address)");
    const tok = await prisma.verificationToken.count({
      where: { userId: user!.id, type: "EMAIL_VERIFICATION", consumedAt: null },
    });
    assert(tok === 1, "verification token still issued, so resend can deliver it later");
    assert(stub.calls() === 3, `network failure retried to the cap (3 attempts, got ${stub.calls()})`);
  }

  console.log("\n▶ 2. Transient 429 then success → retried, not lost");
  {
    const stub = stubResend((n) =>
      n < 3
        ? new Response("rate limited", { status: 429 })
        : new Response(JSON.stringify({ id: "sent" }), { status: 200 }),
    );
    const result = await sendEmail(verifyTpl(EMAILS.ratelimit, "https://tedis.test/verify?token=x"));
    stub.restore();
    assert(result.ok, "recovers once the rate limit clears");
    assert(stub.calls() === 3, `retried until success (3 attempts, got ${stub.calls()})`);
  }

  console.log("\n▶ 3. Hard 4xx → fails fast, no wasted retries");
  {
    const stub = stubResend(() => new Response("invalid api key", { status: 401 }));
    const result = await sendEmail(verifyTpl(EMAILS.ok, "https://tedis.test/verify?token=x"));
    stub.restore();
    assert(!result.ok, "401 reported as a failure");
    assert(!result.ok && result.retryable === false, "401 classified non-retryable");
    assert(stub.calls() === 1, `attempted exactly once (got ${stub.calls()})`);
  }

  console.log("\n▶ 4. Happy path → single call, HTML + text both present");
  {
    let seenBody: Record<string, unknown> = {};
    const stub = stubResend(() => new Response(JSON.stringify({ id: "ok" }), { status: 200 }));
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.body) seenBody = JSON.parse(String(init.body));
      return realFetch(input as RequestInfo, init);
    }) as typeof fetch;

    const result = await sendEmail(verifyTpl(EMAILS.ok, "https://tedis.test/verify?token=abc"));
    stub.restore();

    assert(result.ok, "send succeeds");
    assert(stub.calls() === 1, "no unnecessary retry on success");
    assert(typeof seenBody.html === "string" && (seenBody.html as string).includes("<!doctype html>"), "HTML part is sent");
    assert(typeof seenBody.text === "string" && (seenBody.text as string).length > 0, "text fallback is sent");
    assert((seenBody.html as string).includes("https://tedis.test/verify?token=abc"), "CTA URL present in HTML");
    assert(seenBody.from === "TedIS <noreply@tedis.test>", "display-name From is passed through");
  }

  console.log("\n▶ 5. Enumeration: provider failure must not distinguish accounts");
  {
    await auth.register(
      { displayName: "Enum", username: "emailenum", email: EMAILS.enum, password: "Sup3rSecret1" },
      { ipAddress: "198.51.100.2" },
    );

    const stub = stubResend(() => new Response("boom", { status: 500 }));
    let knownThrew = false;
    let unknownThrew = false;
    try { await auth.resendVerification(EMAILS.enum); } catch { knownThrew = true; }
    try { await auth.resendVerification("definitely-not-registered@tedis.test"); } catch { unknownThrew = true; }
    try { await auth.requestPasswordReset(EMAILS.enum); } catch { knownThrew = true; }
    try { await auth.requestPasswordReset("definitely-not-registered@tedis.test"); } catch { unknownThrew = true; }
    stub.restore();

    assert(!knownThrew, "known address does not throw when the provider fails");
    assert(!unknownThrew, "unknown address does not throw");
    assert(knownThrew === unknownThrew, "both paths are indistinguishable to the caller");
  }

  console.log("\n▶ 6. Timeout is bounded, not open-ended");
  {
    const stub = stubResend(
      () => new Promise<Response>((_res, rej) => setTimeout(() => rej(new Error("TimeoutError")), 50)),
    );
    const started = Date.now();
    const result = await sendEmail(verifyTpl(EMAILS.ok, "https://tedis.test/verify?token=x"));
    const elapsed = Date.now() - started;
    stub.restore();
    assert(!result.ok, "timeout surfaces as a failure");
    assert(elapsed < 10_000, `bounded by retry backoff, not left hanging (${elapsed}ms)`);
  }

  await cleanup();
  console.log(`\n──────────────\nPASS ${passed}  FAIL ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
    redis?.disconnect();
  });
