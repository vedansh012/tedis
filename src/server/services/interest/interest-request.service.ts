import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAudit } from "@/server/services/audit/audit";
import { INTEREST_REWARD_POINTS } from "@/features/interest/constants";
import type { SuggestInterestInput, PublishInterestInput } from "@/features/interest/schema";

/** A user submits a new-interest suggestion. Stored PENDING for admin review. */
export async function submitRequest(userId: string, input: SuggestInterestInput) {
  // Soft guard against spamming the same idea: block an identical still-pending
  // name from the same user.
  const dup = await prisma.interestRequest.findFirst({
    where: { requesterId: userId, status: "PENDING", name: { equals: input.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (dup) {
    throw new TRPCError({ code: "CONFLICT", message: "You've already suggested this — it's pending review." });
  }

  // If an interest with this name already exists, tell the user rather than queueing noise.
  const existing = await prisma.interest.findFirst({
    where: { deletedAt: null, name: { equals: input.name, mode: "insensitive" } },
    select: { slug: true, name: true },
  });
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `“${existing.name}” already exists — find it on Explore.`,
    });
  }

  const request = await prisma.interestRequest.create({
    data: {
      requesterId: userId,
      name: input.name,
      description: input.description,
      reason: input.reason,
    },
    select: { id: true },
  });
  return { id: request.id };
}

/** A user's contribution summary: reward points + their suggestion history. */
export async function myContribution(userId: string) {
  const [user, suggestions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { rewardPoints: true } }),
    prisma.interestRequest.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        publishedInterest: { select: { slug: true, name: true } },
      },
    }),
  ]);
  return { points: user?.rewardPoints ?? 0, suggestions };
}

/** Count of requests awaiting review — drives the admin nav badge. */
export function pendingRequestCount() {
  return prisma.interestRequest.count({ where: { status: "PENDING" } });
}

/** Admin queue. Defaults to pending; pass a status to review history. */
export function listRequests(status: "PENDING" | "APPROVED" | "REJECTED" | "MERGED" = "PENDING", limit = 100) {
  return prisma.interestRequest.findMany({
    where: { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, // oldest-first queue
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      reason: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      reviewNote: true,
      requester: { select: { id: true, username: true, displayName: true, profile: { select: { avatarUrl: true } } } },
      reviewedBy: { select: { username: true, displayName: true } },
      publishedInterest: { select: { slug: true, name: true } },
      _count: { select: { mergedFrom: true } },
    },
  });
}

/** Reject a pending request with an optional reason. No reward, no interest. */
export async function rejectRequest(actorId: string, requestId: string, note?: string) {
  const req = await prisma.interestRequest.findUnique({ where: { id: requestId }, select: { status: true } });
  if (!req) throw new TRPCError({ code: "NOT_FOUND" });
  if (req.status !== "PENDING") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This request has already been reviewed." });
  }
  await prisma.interestRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", reviewedById: actorId, reviewedAt: new Date(), reviewNote: note?.trim() || null },
  });
  await writeAudit({ actorId, action: "admin.interest.request.reject", targetType: "INTEREST_REQUEST", targetId: requestId });
  return { ok: true as const };
}

/**
 * Fold one pending request into another as a duplicate. The merged request is
 * resolved when its target is published (and its requester rewarded then).
 */
export async function mergeRequest(actorId: string, requestId: string, intoRequestId: string) {
  if (requestId === intoRequestId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Can't merge a request into itself." });
  }
  const [src, target] = await Promise.all([
    prisma.interestRequest.findUnique({ where: { id: requestId }, select: { status: true } }),
    prisma.interestRequest.findUnique({ where: { id: intoRequestId }, select: { status: true } }),
  ]);
  if (!src || !target) throw new TRPCError({ code: "NOT_FOUND" });
  if (src.status !== "PENDING" || target.status !== "PENDING") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Both requests must be pending to merge." });
  }
  await prisma.interestRequest.update({
    where: { id: requestId },
    data: { status: "MERGED", mergedIntoId: intoRequestId, reviewedById: actorId, reviewedAt: new Date() },
  });
  await writeAudit({
    actorId,
    action: "admin.interest.request.merge",
    targetType: "INTEREST_REQUEST",
    targetId: requestId,
    metadata: { intoRequestId },
  });
  return { ok: true as const };
}

/**
 * Approve + publish a request in one click: creates the Interest, resolves the
 * primary request and any duplicates, rewards every distinct requester with
 * points, and sends each a thank-you notification — all in one transaction.
 */
export async function publishInterest(actorId: string, input: PublishInterestInput) {
  const primary = await prisma.interestRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, status: true, requesterId: true },
  });
  if (!primary) throw new TRPCError({ code: "NOT_FOUND" });
  if (primary.status !== "PENDING") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This request has already been reviewed." });
  }

  // Slug + name must be free (case-insensitive on name).
  const [slugTaken, nameTaken] = await Promise.all([
    prisma.interest.findUnique({ where: { slug: input.slug }, select: { id: true } }),
    prisma.interest.findFirst({ where: { name: { equals: input.name, mode: "insensitive" } }, select: { id: true } }),
  ]);
  if (slugTaken) throw new TRPCError({ code: "CONFLICT", message: `Slug “${input.slug}” is taken.` });
  if (nameTaken) throw new TRPCError({ code: "CONFLICT", message: `An interest named “${input.name}” already exists.` });

  // Validate the duplicate set: only still-pending requests, excluding the primary.
  const dupIds = (input.duplicateRequestIds ?? []).filter((id) => id !== input.requestId);
  const duplicates = dupIds.length
    ? await prisma.interestRequest.findMany({
        where: { id: { in: dupIds }, status: "PENDING" },
        select: { id: true, requesterId: true },
      })
    : [];

  const maxOrder = await prisma.interest.aggregate({ _max: { sortOrder: true } });
  const now = new Date();

  const interest = await prisma.$transaction(async (tx) => {
    const created = await tx.interest.create({
      data: {
        slug: input.slug,
        name: input.name,
        tagline: input.tagline || null,
        description: input.description || null,
        accentColor: input.accentColor || null,
        iconKey: input.iconKey || null,
        isFeatured: input.isFeatured ?? false,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      select: { id: true, slug: true, name: true },
    });

    // Resolve the primary request.
    await tx.interestRequest.update({
      where: { id: primary.id },
      data: { status: "APPROVED", reviewedById: actorId, reviewedAt: now, publishedInterestId: created.id },
    });

    // Resolve duplicates as MERGED, pointed at the published interest.
    if (duplicates.length) {
      await tx.interestRequest.updateMany({
        where: { id: { in: duplicates.map((d) => d.id) } },
        data: {
          status: "MERGED",
          reviewedById: actorId,
          reviewedAt: now,
          mergedIntoId: primary.id,
          publishedInterestId: created.id,
        },
      });
    }

    // Reward every distinct requester once, and notify them.
    const requesterIds = [...new Set([primary.requesterId, ...duplicates.map((d) => d.requesterId)])];
    await tx.user.updateMany({
      where: { id: { in: requesterIds } },
      data: { rewardPoints: { increment: INTEREST_REWARD_POINTS } },
    });
    await tx.notification.createMany({
      data: requesterIds.map((recipientId) => ({
        recipientId,
        type: "SYSTEM" as const,
        interestId: created.id,
        data: {
          kind: "INTEREST_APPROVED",
          interestName: created.name,
          interestSlug: created.slug,
          points: INTEREST_REWARD_POINTS,
          message: `Your suggested interest “${created.name}” is now live. +${INTEREST_REWARD_POINTS} points — thanks for improving TedIS!`,
        },
      })),
    });

    return created;
  });

  await writeAudit({
    actorId,
    action: "admin.interest.publish",
    targetType: "INTEREST",
    targetId: interest.id,
    metadata: { requestId: primary.id, mergedCount: duplicates.length, slug: interest.slug },
  });

  return { ok: true as const, slug: interest.slug };
}
