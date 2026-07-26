import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { redis } from "@/server/db/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache a health probe

/**
 * Liveness/readiness probe for load balancers + uptime monitors.
 * Returns 200 only when the app AND its critical dependencies are reachable,
 * 503 otherwise — so an orchestrator can pull a bad instance out of rotation.
 * No auth, no sensitive data.
 */
export async function GET() {
  const started = Date.now();

  const [db, cache] = await Promise.all([
    check(() => prisma.$queryRaw`SELECT 1`),
    check(() => redis.ping()),
  ]);

  const healthy = db.ok && cache.ok;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      uptimeSec: Math.round(process.uptime()),
      checks: { database: db, redis: cache },
      tookMs: Date.now() - started,
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function check(fn: () => Promise<unknown>): Promise<{ ok: boolean; ms: number }> {
  const t = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - t };
  } catch {
    return { ok: false, ms: Date.now() - t };
  }
}
