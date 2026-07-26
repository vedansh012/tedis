import Redis from "ioredis";
import { serverEnv, isProd } from "@/config/env";

/**
 * Redis singleton (ioredis). Same hot-reload guard as Prisma.
 * Used for: rate-limit counters, session hot-cache, presence, pub/sub for
 * realtime, and BullMQ job queues. Never the source of truth.
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(serverEnv.REDIS_URL, {
    // BullMQ requires this; harmless for general use.
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });

if (!isProd) globalForRedis.redis = redis;
