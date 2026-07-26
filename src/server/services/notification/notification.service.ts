import { prisma } from "@/server/db/prisma";
import { cursorInput, decodeCursor, cursorWhere, keysetOrderBy, toPage, type CursorInput } from "@/lib/pagination";

export function unreadCount(userId: string) {
  return prisma.notification.count({ where: { recipientId: userId, readAt: null } });
}

export async function listNotifications(userId: string, input: CursorInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.notification.findMany({
    where: { recipientId: userId, ...cursorWhere(decoded) },
    take: limit + 1,
    orderBy: keysetOrderBy,
    select: {
      id: true,
      createdAt: true,
      type: true,
      readAt: true,
      targetType: true,
      targetId: true,
      data: true,
      actor: { select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } } },
    },
  });
  return toPage(rows, limit);
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}
