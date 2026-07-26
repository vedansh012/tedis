import { redis } from "@/server/db/redis";

/**
 * Realtime backbone for 1-on-1 chat: Redis pub/sub fan-out + presence keys.
 * Sending is a tRPC mutation; receiving is the SSE stream in
 * app/api/realtime/route.ts. Pub/sub means an SSE client on instance A receives
 * events published from instance B — no sticky sessions, scales horizontally.
 * This module is Prisma-free on purpose (pure transport).
 */

export type RtEvent =
  | { t: "message"; conversationId: string; message: RtMessage }
  | { t: "typing"; conversationId: string; userId: string }
  | { t: "read"; conversationId: string; userId: string; at: string }
  | { t: "presence"; userId: string; online: boolean };

export interface RtMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  createdAt: Date | string;
}

export const userChannel = (userId: string) => `rt:user:${userId}`;
const presenceKey = (userId: string) => `presence:${userId}`;

/** Fan an event out to a set of recipients (their SSE streams subscribe to their channel). */
export async function publishToUsers(userIds: string[], event: RtEvent): Promise<void> {
  if (userIds.length === 0) return;
  const payload = JSON.stringify(event);
  await Promise.all(userIds.map((id) => redis.publish(userChannel(id), payload)));
}

/** Presence TTL (seconds). The SSE stream refreshes at ~half this cadence, so a
 *  90s TTL means one presence write per ~minute per online user (not per 15s) —
 *  ~4× fewer Redis commands, which matters on a free Redis tier. */
export const PRESENCE_TTL_SEC = 90;

/** Presence: a short-TTL key kept alive by the live SSE heartbeat. */
export async function markOnline(userId: string): Promise<void> {
  await redis.set(presenceKey(userId), "1", "EX", PRESENCE_TTL_SEC);
}
export async function markOffline(userId: string): Promise<void> {
  await redis.del(presenceKey(userId));
}
export async function isOnline(userId: string): Promise<boolean> {
  return (await redis.exists(presenceKey(userId))) === 1;
}
