import { prisma } from "@/server/db/prisma";
import { writeAudit } from "@/server/services/audit/audit";
import type { ReportReason, ReportTarget } from "@/features/moderation/constants";

// ---- Reporting -------------------------------------------------------------

export interface SubmitReportInput {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details?: string | null;
}

/**
 * File a report. Idempotent per (reporter, target): a user re-reporting the same
 * thing updates their existing open report rather than flooding the queue.
 * You can't report your own content or yourself.
 */
export async function submitReport(reporterId: string, input: SubmitReportInput) {
  if (input.targetType === "USER" && input.targetId === reporterId) {
    return { ok: false as const, error: "SELF" as const };
  }
  // Prevent reporting your own posts/comments/projects.
  if (input.targetType !== "USER") {
    const authorId = await ownerOf(input.targetType, input.targetId);
    if (authorId && authorId === reporterId) return { ok: false as const, error: "SELF" as const };
    if (authorId === null) return { ok: false as const, error: "NOT_FOUND" as const };
  }

  const existing = await prisma.report.findFirst({
    where: { reporterId, targetType: input.targetType, targetId: input.targetId, status: "OPEN" },
    select: { id: true },
  });

  if (existing) {
    await prisma.report.update({
      where: { id: existing.id },
      data: { reason: input.reason, details: input.details ?? null },
    });
  } else {
    await prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
      },
    });
  }
  return { ok: true as const };
}

async function ownerOf(targetType: ReportTarget, targetId: string): Promise<string | null> {
  switch (targetType) {
    case "POST": {
      const p = await prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true } });
      return p?.authorId ?? null;
    }
    case "COMMENT": {
      const c = await prisma.comment.findUnique({ where: { id: targetId }, select: { authorId: true } });
      return c?.authorId ?? null;
    }
    case "PROJECT": {
      const pr = await prisma.project.findUnique({ where: { id: targetId }, select: { ownerId: true } });
      return pr?.ownerId ?? null;
    }
    default:
      return null;
  }
}

// ---- Blocking --------------------------------------------------------------

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return { blocked: false };
  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    }),
    // Blocking implies unfollowing in both directions.
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    }),
  ]);
  await writeAudit({ actorId: blockerId, action: "user.block", targetType: "USER", targetId: blockedId });
  return { blocked: true };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.block
    .delete({ where: { blockerId_blockedId: { blockerId, blockedId } } })
    .catch(() => null);
  return { blocked: false };
}

/**
 * All user ids the viewer should not see content from — everyone they've blocked
 * AND everyone who has blocked them (blocks are symmetric for visibility).
 * Feed/comment/profile services use this to filter.
 */
export async function getHiddenUserIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.blockerId === viewerId ? r.blockedId : r.blockerId);
  }
  return [...ids];
}

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const n = await prisma.block.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return n > 0;
}

// ---- Admin moderation queue ------------------------------------------------

export async function listReports(status: "OPEN" | "RESOLVED" | "DISMISSED" = "OPEN", limit = 50) {
  return prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      reporter: { select: { username: true, displayName: true } },
    },
  });
}

export async function resolveReport(
  actorId: string,
  reportId: string,
  action: "RESOLVED" | "DISMISSED",
) {
  await prisma.report.update({
    where: { id: reportId },
    data: { status: action, resolvedAt: new Date() },
  });
  await writeAudit({ actorId, action: `report.${action.toLowerCase()}`, targetType: "REPORT", targetId: reportId });
  return { ok: true as const };
}
