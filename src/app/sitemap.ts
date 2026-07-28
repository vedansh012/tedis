import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/prisma";

const BASE = process.env.APP_URL ?? "http://localhost:3000";

/**
 * Dynamic sitemap: static marketing routes + public, indexable content
 * (interests, projects). Capped so it stays fast; paginate into multiple
 * sitemaps if the catalog grows past the 50k-URL limit.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/signup`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [interests, projects] = await Promise.all([
      prisma.interest.findMany({
        where: { deletedAt: null },
        select: { slug: true, updatedAt: true },
        take: 500,
      }),
      prisma.project.findMany({
        where: { deletedAt: null, visibility: "PUBLIC" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
    ]);

    return [
      ...staticRoutes,
      ...interests.map((i) => ({
        url: `${BASE}/interest/${i.slug}`,
        lastModified: i.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
      ...projects.map((p) => ({
        url: `${BASE}/projects/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // If the DB is unavailable at build/request time, still serve static routes.
    return staticRoutes;
  }
}
