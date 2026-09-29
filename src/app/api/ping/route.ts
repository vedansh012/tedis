import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dependency-free liveness probe. The keep-awake pinger and Render's health
 * check hit this every few minutes, so it must NOT touch Postgres or Redis:
 * each DB query wakes Neon's suspended compute and burns free-tier hours.
 * Use /api/health when you actually want to verify dependencies.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", uptimeSec: Math.round(process.uptime()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
