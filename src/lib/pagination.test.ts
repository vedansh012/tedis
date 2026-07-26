import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor, toPage, cursorWhere } from "./pagination";

describe("cursor encode/decode", () => {
  it("round-trips a (createdAt, id) cursor", () => {
    const createdAt = new Date("2026-07-25T12:34:56.000Z");
    const decoded = decodeCursor(encodeCursor({ createdAt, id: "abc123" }));
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe("abc123");
    expect(decoded!.createdAt.toISOString()).toBe(createdAt.toISOString());
  });

  it("returns null for empty/garbage/invalid-date cursors", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
    expect(decodeCursor(Buffer.from("no-separator").toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from("not-a-date|id").toString("base64url"))).toBeNull();
  });
});

describe("toPage — keyset windowing", () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ id: `id${i}`, createdAt: new Date(2026, 0, 10 - i) }));

  it("trims the +1 sentinel and emits a nextCursor when more exist", () => {
    const page = toPage(rows, 5);
    expect(page.items).toHaveLength(5);
    expect(page.nextCursor).not.toBeNull();
    // cursor points at the last returned item
    expect(decodeCursor(page.nextCursor)!.id).toBe("id4");
  });

  it("returns all rows and no cursor when the page isn't full", () => {
    const page = toPage(rows.slice(0, 3), 5);
    expect(page.items).toHaveLength(3);
    expect(page.nextCursor).toBeNull();
  });
});

describe("cursorWhere — strictly-older predicate", () => {
  it("is empty without a cursor (first page)", () => {
    expect(cursorWhere(null)).toEqual({});
  });
  it("builds the (createdAt <, or =+id<) tie-breaker", () => {
    const c = { createdAt: new Date("2026-01-01T00:00:00Z"), id: "x" };
    const w = cursorWhere(c) as { OR: unknown[] };
    expect(w.OR).toHaveLength(2);
    expect(w.OR[0]).toEqual({ createdAt: { lt: c.createdAt } });
    expect(w.OR[1]).toEqual({ createdAt: c.createdAt, id: { lt: "x" } });
  });
});
