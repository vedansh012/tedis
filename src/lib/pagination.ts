import { z } from "zod";

/**
 * Keyset (cursor) pagination. We paginate on a stable composite key so results
 * never shift/duplicate under inserts — offset pagination can't do that at scale.
 * The opaque cursor encodes the last item's (createdAt, id).
 */
export const cursorInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().nullish(),
});
export type CursorInput = z.infer<typeof cursorInput>;

export interface Cursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt.toISOString()}|${c.id}`).toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const [iso, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
    if (!iso || !id) return null;
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Given rows fetched with `take: limit + 1` ordered by (createdAt desc, id desc),
 * split off the sentinel row and produce the next cursor.
 */
export function toPage<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}

/** Prisma `where` fragment for "strictly older than cursor" on (createdAt, id). */
export function cursorWhere(cursor: Cursor | null) {
  if (!cursor) return {};
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

export const keysetOrderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
