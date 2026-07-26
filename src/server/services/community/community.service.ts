import type { CommunityVisibility } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { uniqueSlug } from "@/lib/slug";
import {
  cursorInput,
  decodeCursor,
  cursorWhere,
  keysetOrderBy,
  toPage,
  type CursorInput,
} from "@/lib/pagination";

const listSelect = {
  id: true,
  createdAt: true,
  slug: true,
  name: true,
  purpose: true,
  visibility: true,
  membersCount: true,
  threadsCount: true,
  interest: { select: { slug: true, name: true, accentColor: true } },
};

export interface ListCommunitiesInput extends CursorInput {
  interestId?: string | null;
}

export async function listCommunities(input: ListCommunitiesInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.community.findMany({
    where: {
      deletedAt: null,
      visibility: { not: "PRIVATE" },
      ...(input.interestId ? { interestId: input.interestId } : {}),
      ...cursorWhere(decoded),
    },
    take: limit + 1,
    orderBy: keysetOrderBy,
    select: listSelect,
  });
  return toPage(rows, limit);
}

export async function getCommunityBySlug(slug: string, viewerId?: string) {
  const community = await prisma.community.findFirst({
    where: { slug, deletedAt: null },
    select: {
      ...listSelect,
      description: true,
      rules: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, body: true } },
    },
  });
  if (!community) return null;

  const membership = viewerId
    ? await prisma.communityMembership.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: viewerId } },
        select: { role: true },
      })
    : null;

  return { ...community, isMember: !!membership, role: membership?.role ?? null };
}

export async function createCommunity(
  ownerId: string,
  input: { interestId: string; name: string; purpose?: string; description?: string; visibility?: CommunityVisibility },
) {
  const slug = await uniqueSlug(input.name, async (s) => {
    const found = await prisma.community.findUnique({ where: { slug: s }, select: { id: true } });
    return !!found;
  });

  return prisma.$transaction(async (tx) => {
    const community = await tx.community.create({
      data: {
        slug,
        interestId: input.interestId,
        name: input.name,
        purpose: input.purpose ?? null,
        description: input.description ?? null,
        visibility: input.visibility ?? "PUBLIC",
        membersCount: 1,
        members: { create: { userId: ownerId, role: "OWNER" } },
      },
      select: { id: true, slug: true },
    });
    return community;
  });
}

export async function joinCommunity(userId: string, communityId: string) {
  const existing = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
  });
  if (existing) return { joined: true };
  await prisma.$transaction([
    prisma.communityMembership.create({ data: { communityId, userId, role: "MEMBER" } }),
    prisma.community.update({ where: { id: communityId }, data: { membersCount: { increment: 1 } } }),
  ]);
  return { joined: true };
}

export async function leaveCommunity(userId: string, communityId: string) {
  const existing = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true },
  });
  if (!existing) return { joined: false };
  // Owners can't casually leave (would orphan the community).
  if (existing.role === "OWNER") return { joined: true, blocked: "OWNER" as const };
  await prisma.$transaction([
    prisma.communityMembership.delete({ where: { communityId_userId: { communityId, userId } } }),
    prisma.community.update({ where: { id: communityId }, data: { membersCount: { decrement: 1 } } }),
  ]);
  return { joined: false };
}

// ---- threads ---------------------------------------------------------------

const threadSelect = {
  id: true,
  createdAt: true,
  title: true,
  body: true,
  isPinned: true,
  isLocked: true,
  repliesCount: true,
  reactionsCount: true,
  lastReplyAt: true,
  author: {
    select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } },
  },
};

export async function listThreads(communityId: string, input: CursorInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.thread.findMany({
    where: { communityId, deletedAt: null, ...cursorWhere(decoded) },
    take: limit + 1,
    orderBy: [{ isPinned: "desc" }, ...keysetOrderBy],
    select: threadSelect,
  });
  return toPage(rows, limit);
}

export async function getThread(threadId: string) {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, deletedAt: null },
    select: {
      ...threadSelect,
      community: { select: { slug: true, name: true } },
    },
  });
  if (!thread) return null;

  const replies = await prisma.threadReply.findMany({
    where: { threadId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      createdAt: true,
      body: true,
      author: { select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } } },
    },
  });

  return { ...thread, replies };
}

async function assertMember(userId: string, communityId: string) {
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { userId: true },
  });
  return !!membership;
}

export async function createThread(
  userId: string,
  communityId: string,
  input: { title: string; body: string },
) {
  if (!(await assertMember(userId, communityId))) return { ok: false as const, error: "NOT_MEMBER" as const };
  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.thread.create({
      data: { communityId, authorId: userId, title: input.title, body: input.body },
      select: { id: true },
    });
    await tx.community.update({ where: { id: communityId }, data: { threadsCount: { increment: 1 } } });
    return created;
  });
  return { ok: true as const, threadId: thread.id };
}

export async function createReply(
  userId: string,
  threadId: string,
  input: { body: string },
) {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, deletedAt: null },
    select: { communityId: true, isLocked: true },
  });
  if (!thread) return { ok: false as const, error: "NOT_FOUND" as const };
  if (thread.isLocked) return { ok: false as const, error: "LOCKED" as const };
  if (!(await assertMember(userId, thread.communityId))) return { ok: false as const, error: "NOT_MEMBER" as const };

  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.threadReply.create({
      data: { threadId, authorId: userId, body: input.body },
      select: { id: true },
    });
    await tx.thread.update({
      where: { id: threadId },
      data: { repliesCount: { increment: 1 }, lastReplyAt: new Date() },
    });
    return created;
  });
  return { ok: true as const, replyId: reply.id };
}
