import { prisma } from "@/server/db/prisma";
import { isBlockedEitherWay } from "@/server/services/moderation/moderation.service";
import { publishToUsers, isOnline } from "./realtime";

/** Deterministic one-DM-per-pair key. */
function directKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Participant guard — reused by every read/write. True only for active members. */
export async function assertParticipant(conversationId: string, userId: string): Promise<boolean> {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { leftAt: true },
  });
  return !!p && p.leftAt === null;
}

/** Everyone in a conversation (for fan-out). */
async function participantIds(conversationId: string): Promise<string[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

/** Distinct users the viewer shares any conversation with (for presence fan-out). */
export async function peerIds(userId: string): Promise<string[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { conversation: { participants: { some: { userId } } }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((r) => r.userId);
}

export async function broadcastPresence(userId: string, online: boolean): Promise<void> {
  await publishToUsers(await peerIds(userId), { t: "presence", userId, online });
}

/** Open (or reuse) a DM. Refused if either user blocks the other. Race-safe via unique directKey. */
export async function getOrCreateDirect(me: string, other: string): Promise<{ id: string }> {
  if (me === other) throw new Error("Cannot message yourself");
  if (await isBlockedEitherWay(me, other)) throw new Error("This user is unavailable");

  const key = directKey(me, other);
  const existing = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });
  if (existing) return existing;

  try {
    const convo = await prisma.conversation.create({
      data: { type: "DIRECT", directKey: key, participants: { create: [{ userId: me }, { userId: other }] } },
      select: { id: true },
    });
    return convo;
  } catch {
    // Lost a create race on the unique directKey — fetch the winner.
    const won = await prisma.conversation.findUnique({ where: { directKey: key }, select: { id: true } });
    if (won) return won;
    throw new Error("Could not open conversation");
  }
}

/** My active threads: peer, latest message, unread count, peer online state. */
export async function listConversations(me: string) {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId: me, leftAt: null, conversation: { lastMessageAt: { not: null } } },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    take: 40,
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          type: true,
          lastMessageAt: true,
          participants: {
            where: { userId: { not: me } },
            select: {
              lastReadAt: true,
              user: { select: { id: true, username: true, displayName: true, profile: { select: { avatarUrl: true } } } },
            },
          },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, senderId: true, createdAt: true },
          },
        },
      },
    },
  });

  // Unread per conversation (parallel counts for the page; swap to one raw
  // aggregate query if a user routinely has hundreds of active threads).
  const withUnread = await Promise.all(
    parts.map(async (p) => {
      const peer = p.conversation.participants[0];
      const unread = await prisma.message.count({
        where: {
          conversationId: p.conversation.id,
          deletedAt: null,
          senderId: { not: me },
          createdAt: { gt: p.lastReadAt ?? new Date(0) },
        },
      });
      return {
        id: p.conversation.id,
        peer: peer?.user ?? null,
        peerLastReadAt: peer?.lastReadAt ?? null,
        peerOnline: peer ? await isOnline(peer.user.id) : false,
        lastMessage: p.conversation.messages[0] ?? null,
        lastMessageAt: p.conversation.lastMessageAt,
        unread,
      };
    }),
  );
  return withUnread;
}

/** One conversation's header (peer + my read cursor) — for the chat window. */
export async function getConversation(me: string, conversationId: string) {
  if (!(await assertParticipant(conversationId, me))) throw new Error("Forbidden");
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participants: {
        select: {
          userId: true,
          lastReadAt: true,
          user: { select: { id: true, username: true, displayName: true, profile: { select: { avatarUrl: true } } } },
        },
      },
    },
  });
  if (!convo) throw new Error("Not found");
  const peer = convo.participants.find((p) => p.userId !== me);
  return {
    id: convo.id,
    peer: peer?.user ?? null,
    peerLastReadAt: peer?.lastReadAt ?? null,
    peerOnline: peer ? await isOnline(peer.userId) : false,
  };
}

/** Keyset-paginated history (fetched newest-first; render reversed). */
export async function getMessages(me: string, conversationId: string, cursor?: string, limit = 30) {
  if (!(await assertParticipant(conversationId, me))) throw new Error("Forbidden");
  const rows = await prisma.message.findMany({
    where: { conversationId, deletedAt: null, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: { id: true, conversationId: true, body: true, senderId: true, createdAt: true },
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : null;
  return { items: page.reverse(), nextCursor };
}

/** Persist a message, bump the conversation, fan out over Redis. */
export async function sendMessage(me: string, conversationId: string, body: string) {
  if (!(await assertParticipant(conversationId, me))) throw new Error("Forbidden");
  const text = body.trim();
  if (!text) throw new Error("Message is empty");
  if (text.length > 4000) throw new Error("Message is too long");

  const message = await prisma.message.create({
    data: { conversationId, senderId: me, body: text },
    select: { id: true, conversationId: true, body: true, senderId: true, createdAt: true },
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });

  await publishToUsers(await participantIds(conversationId), { t: "message", conversationId, message });
  return message;
}

/** Advance my read cursor and tell the other participants (for "seen"). */
export async function markRead(me: string, conversationId: string) {
  if (!(await assertParticipant(conversationId, me))) throw new Error("Forbidden");
  const at = new Date();
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: me } },
    data: { lastReadAt: at },
  });
  const others = (await participantIds(conversationId)).filter((id) => id !== me);
  await publishToUsers(others, { t: "read", conversationId, userId: me, at: at.toISOString() });
  return { at };
}

/** Lightweight, non-persisted typing ping to the other participants. */
export async function sendTyping(me: string, conversationId: string) {
  if (!(await assertParticipant(conversationId, me))) return;
  const others = (await participantIds(conversationId)).filter((id) => id !== me);
  await publishToUsers(others, { t: "typing", conversationId, userId: me });
}
