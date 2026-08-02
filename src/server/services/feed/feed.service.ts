import type { Prisma, ReactableType, BookmarkableType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getHiddenUserIds } from "@/server/services/moderation/moderation.service";
import {
  cursorInput,
  decodeCursor,
  decodeTieredCursor,
  cursorWhere,
  keysetOrderBy,
  toPage,
  toTieredPage,
  type CursorInput,
} from "@/lib/pagination";

/** Shape returned to feed/post cards, including the viewer's interaction state. */
const postSelect = {
  id: true,
  createdAt: true,
  type: true,
  body: true,
  linkUrl: true,
  gitRepoUrl: true,
  reactionsCount: true,
  commentsCount: true,
  bookmarksCount: true,
  sharesCount: true,
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      profile: { select: { avatarUrl: true, headline: true } },
    },
  },
  interest: { select: { slug: true, name: true, accentColor: true } },
  // Just enough to show the small "which project" indicator on a feed post.
  project: { select: { slug: true, name: true, coverUrl: true } },
  media: {
    select: { id: true, type: true, url: true, thumbnailUrl: true, altText: true, width: true, height: true },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.PostSelect;

type RawPost = Prisma.PostGetPayload<{ select: typeof postSelect }>;

export { postSelect };

export async function decorateViewerState<T extends { id: string }>(
  posts: T[],
  viewerId: string | undefined,
): Promise<(T & { reacted: boolean; bookmarked: boolean })[]> {
  if (!viewerId || posts.length === 0) {
    return posts.map((p) => ({ ...p, reacted: false, bookmarked: false }));
  }
  const ids = posts.map((p) => p.id);
  const [reactions, bookmarks] = await Promise.all([
    prisma.reaction.findMany({
      where: { userId: viewerId, targetType: "POST", targetId: { in: ids } },
      select: { targetId: true },
    }),
    prisma.bookmark.findMany({
      where: { userId: viewerId, targetType: "POST", targetId: { in: ids } },
      select: { targetId: true },
    }),
  ]);
  const reactedSet = new Set(reactions.map((r) => r.targetId));
  const bookmarkedSet = new Set(bookmarks.map((b) => b.targetId));
  return posts.map((p) => ({ ...p, reacted: reactedSet.has(p.id), bookmarked: bookmarkedSet.has(p.id) }));
}

export interface HomeFeedInput extends CursorInput {
  interestId?: string | null;
}

/**
 * "For You" home feed: relevant posts first, then the rest of the platform.
 *
 * Two tiers, each ordered newest-first:
 *   0 — posts in the viewer's Interests, or by people they follow.
 *   1 — every other public post.
 *
 * Tier 0 is exhausted before tier 1 begins, so picking Interests genuinely
 * changes what you see first, while a viewer who has picked nothing still gets
 * a full feed instead of an empty page. That second half is the important one:
 * an interest-only feed shows a new account nothing at all, which reads as a
 * broken product rather than an invitation to choose topics.
 *
 * Selecting a single Interest (the feed pills) is a filter, not a ranking, so it
 * stays strictly scoped to that Interest — no discovery tier.
 *
 * The viewer's own posts are excluded (they live on the viewer's profile), as is
 * anyone in a block relationship with them.
 *
 * Ranking is still follower-blind: tier membership comes from topic relevance
 * and follow edges deciding *visibility*, never from anyone's follower count.
 */
export async function homeFeed(viewerId: string, input: HomeFeedInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeTieredCursor(cursor);

  const [interests, following, hiddenIds] = await Promise.all([
    prisma.userInterest.findMany({ where: { userId: viewerId }, select: { interestId: true } }),
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
    getHiddenUserIds(viewerId),
  ]);
  const followingIds = following.map((f) => f.followingId);

  const base: Prisma.PostWhereInput = {
    deletedAt: null,
    visibility: "PUBLIC",
    authorId: { notIn: [viewerId, ...hiddenIds] },
  };

  // Each entry is one tier's `where`, highest priority first.
  const interestIds = interests.map((u) => u.interestId);
  let tiers: Prisma.PostWhereInput[];
  if (input.interestId) {
    tiers = [{ interestId: input.interestId }];
  } else if (interestIds.length || followingIds.length) {
    const relevant: Prisma.PostWhereInput[] = [];
    const notRelevant: Prisma.PostWhereInput[] = [];
    if (interestIds.length) {
      relevant.push({ interestId: { in: interestIds } });
      // The complement is spelled out rather than written as NOT(IN): an
      // untagged post has interestId NULL, `NULL IN (…)` is NULL, and NOT NULL
      // is still NULL — so a plain negation drops every untagged post out of
      // both tiers and it becomes unreachable from the feed entirely.
      notRelevant.push({ OR: [{ interestId: null }, { interestId: { notIn: interestIds } }] });
    }
    if (followingIds.length) {
      relevant.push({ authorId: { in: followingIds } });
      notRelevant.push({ authorId: { notIn: followingIds } });
    }
    tiers = [{ OR: relevant }, { AND: notRelevant }];
  } else {
    // Nothing to be relevant to — one tier containing everything, which is what
    // makes a brand-new account's feed full instead of empty.
    tiers = [{}];
  }

  // Walk tiers from wherever the cursor left off, topping up until the page is
  // full. Each tier is its own keyset scan, so this stays index-friendly.
  const need = limit + 1;
  const rows: (RawPost & { tier: number })[] = [];
  for (let tier = decoded?.tier ?? 0; tier < tiers.length && rows.length < need; tier++) {
    // Only the tier the cursor points into resumes mid-scan; later ones start fresh.
    const tierCursor = tier === decoded?.tier ? decoded : null;
    const fetched = await prisma.post.findMany({
      // AND, not object spread: both the tier filter and the keyset predicate
      // are `OR` clauses, and spreading them into one object silently drops the
      // first. That turned tier 0 into "everything" on page two and beyond.
      where: { ...base, AND: [tiers[tier]!, cursorWhere(tierCursor)] },
      take: need - rows.length,
      orderBy: keysetOrderBy,
      select: postSelect,
    });
    rows.push(...fetched.map((row) => ({ ...row, tier })));
  }

  const page = toTieredPage(rows, limit);
  const items = await decorateViewerState(page.items, viewerId);
  return { items, nextCursor: page.nextCursor };
}

// FOLLOWER-BLIND RANKING GUARANTEE: no query in this file references
// followersCount, reactionsCount or any popularity signal when ordering. Every
// feed is chronological (keyset on createdAt) within its scope; the home feed
// additionally splits into two topic-relevance tiers before that, which is a
// relevance decision, not a clout one. Follow edges affect *which* posts a
// viewer sees and how early, never how a popular author outranks a quiet one.
// Keep it that way.

export async function interestFeed(interestId: string, viewerId: string | undefined, input: CursorInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.post.findMany({
    where: { deletedAt: null, visibility: "PUBLIC", interestId, ...cursorWhere(decoded) },
    take: limit + 1,
    orderBy: keysetOrderBy,
    select: postSelect,
  });
  const page = toPage(rows, limit);
  const items = await decorateViewerState(page.items, viewerId);
  return { items, nextCursor: page.nextCursor };
}

export async function userPosts(userId: string, viewerId: string | undefined, input: CursorInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.post.findMany({
    where: { deletedAt: null, authorId: userId, ...cursorWhere(decoded) },
    take: limit + 1,
    orderBy: keysetOrderBy,
    select: postSelect,
  });
  const page = toPage(rows, limit);
  const items = await decorateViewerState(page.items, viewerId);
  return { items, nextCursor: page.nextCursor };
}

/**
 * A project's development history: every post attached to the project, in
 * chronological order (oldest first) so a visitor can read the journey from the
 * first update forward — the "watch the evolution" experience. Not follower-
 * ranked; it's a story, ordered by time.
 */
export async function projectTimeline(projectId: string, viewerId: string | undefined) {
  const rows = await prisma.post.findMany({
    where: { deletedAt: null, projectId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: postSelect,
  });
  return decorateViewerState(rows, viewerId);
}

export interface CreatePostMedia {
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
}

export interface CreatePostInput {
  type?: "UPDATE" | "QUESTION" | "RESOURCE" | "DISCUSSION" | "MILESTONE";
  body: string;
  interestId?: string | null;
  projectId?: string | null;
  linkUrl?: string | null;
  gitRepoUrl?: string | null;
  media?: CreatePostMedia[];
}

export async function createPost(authorId: string, input: CreatePostInput): Promise<RawPost> {
  return prisma.post.create({
    data: {
      authorId,
      type: input.type ?? "UPDATE",
      body: input.body,
      interestId: input.interestId ?? null,
      projectId: input.projectId ?? null,
      linkUrl: input.linkUrl ?? null,
      gitRepoUrl: input.gitRepoUrl ?? null,
      media: input.media?.length
        ? {
            create: input.media.map((m, i) => ({
              type: m.type,
              url: m.url,
              thumbnailUrl: m.thumbnailUrl ?? null,
              width: m.width ?? null,
              height: m.height ?? null,
              altText: m.altText ?? null,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    select: postSelect,
  });
}

/** Single post with the viewer's interaction state (for the detail page). */
export async function getPost(id: string, viewerId: string | undefined) {
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    select: postSelect,
  });
  if (!post) return null;
  const [decorated] = await decorateViewerState([post], viewerId);
  return decorated ?? null;
}

/** Posts the viewer has bookmarked, newest first. */
export async function listBookmarkedPosts(viewerId: string, input: CursorInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: viewerId, targetType: "POST", ...cursorWhere(decoded) },
    take: limit + 1,
    orderBy: keysetOrderBy,
    select: { id: true, createdAt: true, targetId: true },
  });
  const page = toPage(bookmarks, limit);
  const postIds = page.items.map((b) => b.targetId);
  const posts = postIds.length
    ? await prisma.post.findMany({ where: { id: { in: postIds }, deletedAt: null }, select: postSelect })
    : [];
  // Preserve bookmark order.
  const byId = new Map(posts.map((p) => [p.id, p]));
  const ordered = postIds.map((id) => byId.get(id)).filter((p): p is RawPost => !!p);
  const items = await decorateViewerState(ordered, viewerId);
  return { items, nextCursor: page.nextCursor };
}

/** Record a share and bump the counter. */
export async function sharePost(userId: string, postId: string, target: string) {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } });
  if (!post) return { ok: false as const };
  await prisma.$transaction([
    prisma.postShare.create({ data: { postId, userId, target } }),
    prisma.post.update({ where: { id: postId }, data: { sharesCount: { increment: 1 } } }),
  ]);
  return { ok: true as const };
}

// ---- reactions & bookmarks -------------------------------------------------

function counterModel(type: ReactableType) {
  switch (type) {
    case "POST":
      return { model: prisma.post, field: "reactionsCount" as const };
    case "PROJECT":
      return { model: prisma.project, field: "reactionsCount" as const };
    case "COMMENT":
      return { model: prisma.comment, field: "reactionsCount" as const };
  }
}

/** Toggle a RESPECT reaction; returns the new state + count. Idempotent per call. */
export async function toggleReaction(userId: string, targetType: ReactableType, targetId: string) {
  const existing = await prisma.reaction.findUnique({
    where: { userId_targetType_targetId_kind: { userId, targetType, targetId, kind: "RESPECT" } },
  });
  const { model, field } = counterModel(targetType);

  if (existing) {
    await prisma.$transaction([
      prisma.reaction.delete({ where: { id: existing.id } }),
      // @ts-expect-error dynamic model union — field is a valid Int column on each
      model.update({ where: { id: targetId }, data: { [field]: { decrement: 1 } } }),
    ]);
    return { reacted: false };
  }

  await prisma.$transaction([
    prisma.reaction.create({ data: { userId, targetType, targetId, kind: "RESPECT" } }),
    // @ts-expect-error dynamic model union — field is a valid Int column on each
    model.update({ where: { id: targetId }, data: { [field]: { increment: 1 } } }),
  ]);
  return { reacted: true };
}

export async function toggleBookmark(userId: string, targetType: BookmarkableType, targetId: string) {
  const existing = await prisma.bookmark.findUnique({
    where: { userId_targetType_targetId: { userId, targetType, targetId } },
  });
  const maintainsCounter = targetType === "POST" || targetType === "PROJECT";

  if (existing) {
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.bookmark.delete({ where: { id: existing.id } }),
    ];
    if (targetType === "POST") ops.push(prisma.post.update({ where: { id: targetId }, data: { bookmarksCount: { decrement: 1 } } }));
    if (targetType === "PROJECT") ops.push(prisma.project.update({ where: { id: targetId }, data: { bookmarksCount: { decrement: 1 } } }));
    await prisma.$transaction(ops);
    return { bookmarked: false };
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.bookmark.create({ data: { userId, targetType, targetId } }),
  ];
  if (targetType === "POST") ops.push(prisma.post.update({ where: { id: targetId }, data: { bookmarksCount: { increment: 1 } } }));
  if (targetType === "PROJECT") ops.push(prisma.project.update({ where: { id: targetId }, data: { bookmarksCount: { increment: 1 } } }));
  await prisma.$transaction(ops);
  void maintainsCounter;
  return { bookmarked: true };
}
