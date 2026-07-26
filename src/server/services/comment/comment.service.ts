import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { cursorInput, decodeCursor, cursorWhere, keysetOrderBy, toPage, type CursorInput } from "@/lib/pagination";

const commentSelect = {
  id: true,
  createdAt: true,
  body: true,
  authorId: true,
  author: {
    select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } },
  },
} satisfies Prisma.CommentSelect;

/** Top-level comments on a post, newest first, keyset-paginated. */
export async function listPostComments(postId: string, viewerId: string | undefined, input: CursorInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.comment.findMany({
    where: { postId, deletedAt: null, parentId: null, ...cursorWhere(decoded) },
    take: limit + 1,
    orderBy: keysetOrderBy,
    select: commentSelect,
  });
  const page = toPage(rows, limit);
  // Flag which comments the viewer may delete (their own).
  const items = page.items.map((c) => ({ ...c, canDelete: viewerId === c.authorId }));
  return { items, nextCursor: page.nextCursor };
}

export type AddCommentResult =
  | { ok: true; comment: Prisma.CommentGetPayload<{ select: typeof commentSelect }> & { canDelete: true } }
  | { ok: false; error: "POST_NOT_FOUND" };

export async function addComment(userId: string, postId: string, body: string): Promise<AddCommentResult> {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true },
  });
  if (!post) return { ok: false, error: "POST_NOT_FOUND" };

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { authorId: userId, postId, body },
      select: commentSelect,
    });
    await tx.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });
    // Notify the post author (never self-notify).
    if (post.authorId !== userId) {
      await tx.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: "COMMENT",
          targetType: "POST",
          targetId: postId,
        },
      });
    }
    return created;
  });

  return { ok: true, comment: { ...comment, canDelete: true } };
}

export type DeleteCommentResult = { ok: true } | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" };

export async function deleteComment(userId: string, commentId: string): Promise<DeleteCommentResult> {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, authorId: true, postId: true },
  });
  if (!comment) return { ok: false, error: "NOT_FOUND" };
  if (comment.authorId !== userId) return { ok: false, error: "FORBIDDEN" };

  await prisma.$transaction(async (tx) => {
    await tx.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
    if (comment.postId) {
      await tx.post.update({ where: { id: comment.postId }, data: { commentsCount: { decrement: 1 } } });
    }
  });
  return { ok: true };
}
