import type { Prisma, UserStatus, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { writeAudit } from "@/server/services/audit/audit";

/** Dashboard KPIs. Cheap COUNTs against indexed columns. */
export async function dashboardMetrics() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const now = new Date();

  const [
    totalUsers,
    activeAccounts,
    newUsersToday,
    activeSessions,
    totalPosts,
    totalProjects,
    totalComments,
    totalMedia,
    openReports,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: startOfDay } } }),
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.postMedia.count(),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);

  return {
    totalUsers,
    activeAccounts,
    newUsersToday,
    activeSessions, // best available proxy for "online" (sliding-expiry sessions)
    totalPosts,
    totalProjects,
    totalComments,
    totalMedia,
    openReports,
    generatedAt: now,
  };
}

/**
 * Daily activity for the last N days — new users, posts, comments per day.
 * One grouped query per table (date_trunc), then filled into a continuous axis
 * so the chart has no gaps. `days` is a clamped integer (safe to interpolate).
 */
export async function activitySeries(days = 14) {
  const n = Math.max(1, Math.min(90, Math.round(days)));

  const daily = async (table: "users" | "posts" | "comments") =>
    prisma.$queryRawUnsafe<{ day: Date; count: number }[]>(
      `SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
         FROM "${table}"
        WHERE "createdAt" >= (now() - interval '${n} days')
          AND "deletedAt" IS NULL
        GROUP BY 1 ORDER BY 1`,
    );

  const [users, posts, comments] = await Promise.all([daily("users"), daily("posts"), daily("comments")]);
  const bucket = (rows: { day: Date; count: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(new Date(r.day).toISOString().slice(0, 10), Number(r.count));
    return m;
  };
  const uM = bucket(users), pM = bucket(posts), cM = bucket(comments);

  const series: { date: string; users: number; posts: number; comments: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, users: uM.get(key) ?? 0, posts: pM.get(key) ?? 0, comments: cM.get(key) ?? 0 });
  }
  return series;
}

/** Live activity feed: newest signups + newest posts, for "what's happening now". */
export async function recentActivity() {
  const [signups, posts] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, username: true, displayName: true, createdAt: true, profile: { select: { avatarUrl: true } } },
    }),
    prisma.post.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } } },
      },
    }),
  ]);
  return { signups, posts };
}

export interface ListUsersInput {
  query?: string;
  limit?: number;
  cursor?: string | null;
}

/** Searchable, paginated user directory for support/moderation. */
export async function listUsers({ query, limit = 25, cursor }: ListUsersInput) {
  const q = query?.trim();
  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      status: true,
      role: true,
      createdAt: true,
      deletedAt: true,
      profile: { select: { avatarUrl: true } },
    },
  });
  const nextCursor = rows.length > limit ? rows[limit - 1]!.id : null;
  return { items: rows.slice(0, limit), nextCursor };
}

/** Suspend / ban / reactivate. Revokes all sessions when access is removed. */
export async function setUserStatus(actorId: string, userId: string, status: UserStatus) {
  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.user.update({ where: { id: userId }, data: { status } }),
  ];
  if (status === "SUSPENDED" || status === "BANNED" || status === "DEACTIVATED") {
    ops.push(prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }));
  }
  await prisma.$transaction(ops);
  await writeAudit({ actorId, action: "admin.user.status", targetType: "USER", targetId: userId, metadata: { status } });
  return { ok: true as const };
}

/** Assign a platform role. Router restricts this to SUPER_ADMIN. */
export async function setUserRole(actorId: string, userId: string, role: UserRole) {
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await writeAudit({ actorId, action: "admin.user.role", targetType: "USER", targetId: userId, metadata: { role } });
  return { ok: true as const };
}

/** Open reports queue for moderation. */
export function openReports(limit = 50) {
  return prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      createdAt: true,
      reporter: { select: { username: true, displayName: true } },
    },
  });
}

/** Recent admin/audit activity for the Logs view. */
export function recentAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      ipAddress: true,
      createdAt: true,
      metadata: true,
      actor: { select: { username: true, displayName: true } },
    },
  });
}
