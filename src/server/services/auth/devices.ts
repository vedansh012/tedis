import { prisma } from "@/server/db/prisma";
import { sha256 } from "@/lib/crypto";

/**
 * Lightweight device recognition from the User-Agent. A real deployment can
 * enrich the fingerprint with client hints; the schema and API don't change.
 */
export function deviceFingerprint(userAgent: string | null | undefined): string {
  return sha256(`ua:${userAgent ?? "unknown"}`);
}

/** Human label from a UA string — best-effort, never throws. */
export function deviceName(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser";
  const os =
    /Mac OS X/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /(iPhone|iPad|iOS)/.test(ua) ? "iOS"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown OS";
  return `${browser} on ${os}`;
}

export interface UpsertedDevice {
  id: string;
  isNew: boolean;
}

export async function upsertDevice(
  userId: string,
  userAgent: string | null | undefined,
  ip: string | null | undefined,
): Promise<UpsertedDevice> {
  const fingerprint = deviceFingerprint(userAgent);
  const existing = await prisma.device.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
    select: { id: true },
  });

  if (existing) {
    await prisma.device.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), lastSeenIp: ip ?? null },
    });
    return { id: existing.id, isNew: false };
  }

  const created = await prisma.device.create({
    data: {
      userId,
      fingerprint,
      name: deviceName(userAgent),
      lastSeenIp: ip ?? null,
    },
    select: { id: true },
  });
  return { id: created.id, isNew: true };
}
