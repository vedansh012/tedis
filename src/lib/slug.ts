import { randomToken } from "@/lib/crypto";

/** Turn arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item"
  );
}

/**
 * Generate a slug unique per an async existence check. Tries the bare slug
 * first, then appends short random suffixes.
 */
export async function uniqueSlug(
  input: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(input);
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${randomToken(3).replace(/[^a-z0-9]/gi, "").slice(0, 4).toLowerCase()}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base}-${randomToken(5).replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase()}`;
}
