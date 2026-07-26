import { PrismaClient } from "@prisma/client";
import { isProd } from "@/config/env";

/**
 * Prisma singleton. Next.js hot-reload in dev otherwise spawns a new client per
 * reload and exhausts the connection pool. We stash it on globalThis in dev only.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ["error"] : ["warn", "error"],
  });

if (!isProd) globalForPrisma.prisma = prisma;
