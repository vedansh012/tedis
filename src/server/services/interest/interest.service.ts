import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAudit } from "@/server/services/audit/audit";
import {
  cursorInput,
  decodeCursor,
  cursorWhere,
  toPage,
  type CursorInput,
} from "@/lib/pagination";
import type { CreateInterestInput, UpdateInterestInput } from "@/features/interest/schema";

/** Read model for Interest cards. */
export function listInterests() {
  return prisma.interest.findMany({
    where: { deletedAt: null, parentId: null },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      accentColor: true,
      iconKey: true,
      membersCount: true,
      projectsCount: true,
    },
  });
}

export async function getInterestBySlug(slug: string, viewerId?: string) {
  const interest = await prisma.interest.findFirst({
    where: { slug, deletedAt: null },
  });
  if (!interest) return null;
  const isMember = viewerId
    ? (await prisma.userInterest.count({ where: { userId: viewerId, interestId: interest.id } })) > 0
    : false;
  return { ...interest, isMember };
}

export function getUserInterests(userId: string) {
  return prisma.userInterest.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    select: {
      interest: {
        select: { id: true, slug: true, name: true, accentColor: true, iconKey: true },
      },
    },
  });
}

/** Replace a user's Interest selection (onboarding + settings). First = primary. */
export async function setUserInterests(userId: string, interestIds: string[]): Promise<void> {
  const valid = await prisma.interest.findMany({
    where: { id: { in: interestIds }, deletedAt: null },
    select: { id: true },
  });
  const validIds = interestIds.filter((id) => valid.some((v) => v.id === id));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.userInterest.findMany({ where: { userId }, select: { interestId: true } });
    const existingIds = new Set(existing.map((e) => e.interestId));
    const nextIds = new Set(validIds);

    const toRemove = [...existingIds].filter((id) => !nextIds.has(id));
    const toAdd = validIds.filter((id) => !existingIds.has(id));

    if (toRemove.length) {
      await tx.userInterest.deleteMany({ where: { userId, interestId: { in: toRemove } } });
      await tx.interest.updateMany({ where: { id: { in: toRemove } }, data: { membersCount: { decrement: 1 } } });
    }
    for (let i = 0; i < validIds.length; i++) {
      const interestId = validIds[i]!;
      await tx.userInterest.upsert({
        where: { userId_interestId: { userId, interestId } },
        create: { userId, interestId, isPrimary: i === 0, sortOrder: i },
        update: { isPrimary: i === 0, sortOrder: i },
      });
    }
    if (toAdd.length) {
      await tx.interest.updateMany({ where: { id: { in: toAdd } }, data: { membersCount: { increment: 1 } } });
    }
  });
}

export async function joinInterest(userId: string, interestId: string): Promise<void> {
  const existing = await prisma.userInterest.findUnique({
    where: { userId_interestId: { userId, interestId } },
  });
  if (existing) return;
  const max = await prisma.userInterest.aggregate({ where: { userId }, _max: { sortOrder: true } });
  await prisma.$transaction([
    prisma.userInterest.create({
      data: { userId, interestId, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    }),
    prisma.interest.update({ where: { id: interestId }, data: { membersCount: { increment: 1 } } }),
  ]);
}

export async function leaveInterest(userId: string, interestId: string): Promise<void> {
  const existing = await prisma.userInterest.findUnique({
    where: { userId_interestId: { userId, interestId } },
  });
  if (!existing) return;
  await prisma.$transaction([
    prisma.userInterest.delete({ where: { userId_interestId: { userId, interestId } } }),
    prisma.interest.update({ where: { id: interestId }, data: { membersCount: { decrement: 1 } } }),
  ]);
}

// ============================================================
// ADMIN: interest management (create / edit / soft-delete)
// ============================================================

/** Full interest list for the admin management table (incl. hidden fields). */
export function adminListInterests() {
  return prisma.interest.findMany({
    where: { deletedAt: null },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      accentColor: true,
      iconKey: true,
      isFeatured: true,
      sortOrder: true,
      membersCount: true,
      projectsCount: true,
    },
  });
}

/** Create an interest directly from the admin panel (no request behind it). */
export async function createInterest(actorId: string, input: CreateInterestInput) {
  const [slugTaken, nameTaken] = await Promise.all([
    prisma.interest.findUnique({ where: { slug: input.slug }, select: { id: true } }),
    prisma.interest.findFirst({ where: { name: { equals: input.name, mode: "insensitive" } }, select: { id: true } }),
  ]);
  if (slugTaken) throw new TRPCError({ code: "CONFLICT", message: `Slug “${input.slug}” is taken.` });
  if (nameTaken) throw new TRPCError({ code: "CONFLICT", message: `An interest named “${input.name}” already exists.` });

  const maxOrder = await prisma.interest.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.interest.create({
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
    select: { id: true, slug: true },
  });
  await writeAudit({ actorId, action: "admin.interest.create", targetType: "INTEREST", targetId: created.id });
  return created;
}

/** Edit an existing interest (name, tagline, icon, accent, feature, order). */
export async function updateInterest(actorId: string, input: UpdateInterestInput) {
  const { id, ...rest } = input;
  const exists = await prisma.interest.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!exists) throw new TRPCError({ code: "NOT_FOUND" });

  if (rest.name) {
    const clash = await prisma.interest.findFirst({
      where: { name: { equals: rest.name, mode: "insensitive" }, id: { not: id } },
      select: { id: true },
    });
    if (clash) throw new TRPCError({ code: "CONFLICT", message: `An interest named “${rest.name}” already exists.` });
  }

  await prisma.interest.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.tagline !== undefined ? { tagline: rest.tagline || null } : {}),
      ...(rest.description !== undefined ? { description: rest.description || null } : {}),
      ...(rest.accentColor !== undefined ? { accentColor: rest.accentColor || null } : {}),
      ...(rest.iconKey !== undefined ? { iconKey: rest.iconKey || null } : {}),
      ...(rest.isFeatured !== undefined ? { isFeatured: rest.isFeatured } : {}),
      ...(rest.sortOrder !== undefined ? { sortOrder: rest.sortOrder } : {}),
    },
  });
  await writeAudit({ actorId, action: "admin.interest.update", targetType: "INTEREST", targetId: id });
  return { ok: true as const };
}

/** Soft-delete an interest. Members/content are preserved but it leaves Explore. */
export async function deleteInterest(actorId: string, id: string) {
  const exists = await prisma.interest.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!exists) throw new TRPCError({ code: "NOT_FOUND" });
  await prisma.interest.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({ actorId, action: "admin.interest.delete", targetType: "INTEREST", targetId: id });
  return { ok: true as const };
}

export async function listInterestMembers(interestId: string, input: CursorInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.userInterest.findMany({
    where: { interestId, user: { deletedAt: null, ...cursorWhere(decoded) } },
    take: limit + 1,
    orderBy: [{ user: { createdAt: "desc" } }, { user: { id: "desc" } }],
    select: {
      user: {
        select: {
          id: true,
          createdAt: true,
          username: true,
          displayName: true,
          profile: { select: { headline: true, avatarUrl: true } },
        },
      },
    },
  });
  const mapped = rows.map((r) => ({ ...r.user }));
  return toPage(mapped, limit);
}
