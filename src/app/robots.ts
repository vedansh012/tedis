import type { MetadataRoute } from "next";

// Per-request for the same reason as the sitemap: APP_URL is a placeholder at
// build time, so a statically generated robots.txt would point crawlers at
// localhost.
export const dynamic = "force-dynamic";

const BASE = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/authed surfaces and the admin panel out of the index.
        disallow: ["/admin", "/api/", "/settings", "/new", "/saved", "/messages", "/notifications", "/onboarding"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
