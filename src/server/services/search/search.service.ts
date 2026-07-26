import { prisma } from "@/server/db/prisma";

/**
 * Global search across the core entities. Uses case-insensitive `contains`
 * (backed by pg_trgm indexes for scale). Each group is capped so the palette
 * stays fast and scannable.
 */
export async function globalSearch(rawQuery: string, perGroup = 6) {
  const q = rawQuery.trim();
  if (q.length < 2) {
    return { users: [], posts: [], projects: [], interests: [], communities: [] };
  }
  const ci = { contains: q, mode: "insensitive" as const };

  const [users, posts, projects, interests, communities] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        onboardedAt: { not: null },
        OR: [{ displayName: ci }, { username: { contains: q, mode: "insensitive" } }],
      },
      take: perGroup,
      select: {
        id: true,
        username: true,
        displayName: true,
        profile: { select: { headline: true, avatarUrl: true } },
      },
    }),
    prisma.post.findMany({
      where: { deletedAt: null, visibility: "PUBLIC", body: ci },
      take: perGroup,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { username: true, displayName: true, profile: { select: { avatarUrl: true } } } },
        project: { select: { slug: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: { deletedAt: null, visibility: "PUBLIC", OR: [{ name: ci }, { tagline: ci }] },
      take: perGroup,
      orderBy: { reactionsCount: "desc" },
      select: { slug: true, name: true, tagline: true, status: true },
    }),
    prisma.interest.findMany({
      where: { deletedAt: null, OR: [{ name: ci }, { tagline: ci }] },
      take: perGroup,
      select: { slug: true, name: true, accentColor: true, iconKey: true, membersCount: true },
    }),
    prisma.community.findMany({
      where: { deletedAt: null, visibility: { not: "PRIVATE" }, OR: [{ name: ci }, { purpose: ci }] },
      take: perGroup,
      select: { slug: true, name: true, purpose: true, membersCount: true },
    }),
  ]);

  return { users, posts, projects, interests, communities };
}
