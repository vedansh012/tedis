import type { Prisma, ProjectStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { randomToken } from "@/lib/crypto";
import {
  cursorInput,
  decodeCursor,
  cursorWhere,
  keysetOrderBy,
  toPage,
  type CursorInput,
} from "@/lib/pagination";

const cardSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  slug: true,
  name: true,
  tagline: true,
  status: true,
  coverUrl: true,
  reactionsCount: true,
  openToCollab: true,
  owner: {
    select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } },
  },
  interest: { select: { slug: true, name: true, accentColor: true } },
  // Post count for the project card ("N posts"), cheaply.
  _count: { select: { posts: { where: { deletedAt: null } } } },
} satisfies Prisma.ProjectSelect;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "project"
  );
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${randomToken(2).replace(/[^a-z0-9]/gi, "").slice(0, 4).toLowerCase()}`;
    const taken = await prisma.project.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${randomToken(4).replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase()}`;
}

export interface ListProjectsInput extends CursorInput {
  interestId?: string | null;
}

export async function listProjects(input: ListProjectsInput) {
  const { limit, cursor } = cursorInput.parse(input);
  const decoded = decodeCursor(cursor);
  const rows = await prisma.project.findMany({
    where: {
      deletedAt: null,
      visibility: "PUBLIC",
      ...(input.interestId ? { interestId: input.interestId } : {}),
      ...cursorWhere(decoded),
    },
    take: limit + 1,
    orderBy: keysetOrderBy,
    select: cardSelect,
  });
  return toPage(rows, limit);
}

export function trendingProjects(limit = 6) {
  return prisma.project.findMany({
    where: { deletedAt: null, visibility: "PUBLIC" },
    orderBy: [{ reactionsCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: cardSelect,
  });
}

/**
 * Time-decayed "hot" ranking. One indexed SQL pass — score computed in
 * Postgres so we never load N rows into Node just to sort them.
 *
 *   score = weighted_engagement / (age_hours + 2)^gravity
 *
 *   weighted_engagement =
 *       3·respects + 2·comments + 2·bookmarks + 4·followers + 2·ln(1+stars)
 *
 * Freshness uses greatest(createdAt, updatedAt) so a live build-log stays hot.
 * Gravity=1.6 (between HN's 1.5 and Reddit's ~1.8) — halves the score roughly
 * every ~30h so a 2-day-old post needs ~3× the engagement of a fresh one.
 */
const HOT_GRAVITY = 1.6;

export interface RankedProject {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: ProjectStatus;
  coverUrl: string | null;
  reactionsCount: number;
  commentsCount: number;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  interestSlug: string | null;
  interestName: string | null;
  interestAccent: string | null;
  score: number;
  rank: number;
}

export async function rankedProjects(limit: number, offset = 0): Promise<RankedProject[]> {
  return prisma.$queryRaw<RankedProject[]>`
    SELECT
      p.id,
      p.slug,
      p.name,
      p.tagline,
      p.status,
      p."coverUrl",
      p."reactionsCount",
      p."commentsCount",
      u.username        AS "ownerUsername",
      u."displayName"   AS "ownerDisplayName",
      pr."avatarUrl"    AS "ownerAvatarUrl",
      i.slug            AS "interestSlug",
      i.name            AS "interestName",
      i."accentColor"   AS "interestAccent",
      (
        (3.0 * p."reactionsCount"
         + 2.0 * p."commentsCount"
         + 2.0 * p."bookmarksCount"
         + 4.0 * p."followersCount"
         + 2.0 * ln(1 + COALESCE(p."githubStars", 0)))
        /
        POWER(
          GREATEST(EXTRACT(EPOCH FROM (NOW() - GREATEST(p."createdAt", p."updatedAt"))) / 3600.0, 0) + 2.0,
          ${HOT_GRAVITY}
        )
      )::float8                                       AS score,
      (ROW_NUMBER() OVER (ORDER BY
        (3.0 * p."reactionsCount"
         + 2.0 * p."commentsCount"
         + 2.0 * p."bookmarksCount"
         + 4.0 * p."followersCount"
         + 2.0 * ln(1 + COALESCE(p."githubStars", 0)))
        /
        POWER(
          GREATEST(EXTRACT(EPOCH FROM (NOW() - GREATEST(p."createdAt", p."updatedAt"))) / 3600.0, 0) + 2.0,
          ${HOT_GRAVITY}
        )
        DESC, p."createdAt" DESC
      ))::int                                         AS rank
    FROM projects p
    JOIN users u        ON u.id = p."ownerId"
    LEFT JOIN profiles pr ON pr."userId" = u.id
    LEFT JOIN universes i ON i.id = p."universeId"
    WHERE p."deletedAt" IS NULL
      AND p.visibility = 'PUBLIC'
    ORDER BY score DESC, p."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

export function listUserProjects(userId: string) {
  return prisma.project.findMany({
    where: { deletedAt: null, ownerId: userId },
    orderBy: keysetOrderBy,
    select: cardSelect,
  });
}

export async function getProjectBySlug(slug: string, viewerId?: string) {
  const project = await prisma.project.findFirst({
    where: { slug, deletedAt: null },
    select: {
      ...cardSelect,
      description: true,
      repoUrl: true,
      githubStars: true,
      bookmarksCount: true,
      commentsCount: true,
      followersCount: true,
      owner: {
        select: { id: true, username: true, displayName: true, profile: { select: { avatarUrl: true, headline: true } } },
      },
      technologies: { select: { tech: { select: { name: true, slug: true, iconKey: true } } } },
      links: { select: { kind: true, label: true, url: true } },
      media: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" } },
      contributors: {
        select: { role: true, user: { select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } } } },
      },
    },
  });
  if (!project) return null;

  const reacted = viewerId
    ? (await prisma.reaction.count({
        where: { userId: viewerId, targetType: "PROJECT", targetId: project.id, kind: "RESPECT" },
      })) > 0
    : false;

  return { ...project, reacted };
}

export interface CreateProjectInput {
  name: string;
  tagline?: string;
  description?: string;
  interestId?: string | null;
  status?: ProjectStatus;
  repoUrl?: string | null;
  coverUrl?: string | null;
  openToCollab?: boolean;
  techIds?: string[];
}

/** The caller's own projects, minimal — powers the composer "attach to project" picker. */
export function listMyProjectsBrief(ownerId: string) {
  return prisma.project.findMany({
    where: { deletedAt: null, ownerId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, slug: true, status: true },
  });
}

export async function createProject(ownerId: string, input: CreateProjectInput) {
  const slug = await uniqueSlug(input.name);
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        ownerId,
        slug,
        name: input.name,
        tagline: input.tagline ?? null,
        description: input.description ?? null,
        interestId: input.interestId ?? null,
        status: input.status ?? "BUILDING",
        repoUrl: input.repoUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        openToCollab: input.openToCollab ?? false,
        technologies: input.techIds?.length
          ? { create: input.techIds.map((techId) => ({ techId })) }
          : undefined,
        contributors: { create: { userId: ownerId, role: "MAINTAINER" } },
      },
      select: { id: true, slug: true },
    });
    await tx.profile.update({ where: { userId: ownerId }, data: { projectsCount: { increment: 1 } } });
    if (input.interestId) {
      await tx.interest.update({ where: { id: input.interestId }, data: { projectsCount: { increment: 1 } } });
    }
    return created;
  });
  return project;
}

/**
 * Owner-only soft delete. Sets deletedAt so every existing read path (all
 * project queries already filter deletedAt) treats the project as gone.
 * Also decrements the profile's projectsCount and, if the project was tagged,
 * the interest's projectsCount — mirroring what createProject bumped up.
 * Attached posts stay on their authors' timelines; only the project vanishes.
 */
export async function deleteProject(projectId: string, userId: string) {
  const row = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, ownerId: true, interestId: true },
  });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  if (row.ownerId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Not your project." });

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
    await tx.profile.update({ where: { userId }, data: { projectsCount: { decrement: 1 } } });
    if (row.interestId) {
      await tx.interest.update({ where: { id: row.interestId }, data: { projectsCount: { decrement: 1 } } });
    }
  });
  return { ok: true as const };
}
