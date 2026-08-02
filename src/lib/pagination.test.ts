import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
  toPage,
  cursorWhere,
  encodeTieredCursor,
  decodeTieredCursor,
  toTieredPage,
} from "./pagination";

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

describe("tiered cursor — multi-bucket feeds", () => {
  const createdAt = new Date("2026-07-25T12:34:56.000Z");

  it("round-trips the tier alongside (createdAt, id)", () => {
    const decoded = decodeTieredCursor(encodeTieredCursor({ tier: 1, createdAt, id: "abc123" }));
    expect(decoded).not.toBeNull();
    expect(decoded!.tier).toBe(1);
    expect(decoded!.id).toBe("abc123");
    expect(decoded!.createdAt.toISOString()).toBe(createdAt.toISOString());
  });

  it("keeps tier 0 distinct from a missing cursor", () => {
    // `?? 0` on a null cursor must not be confused with an explicit tier 0 —
    // both start at the top bucket, but only one resumes mid-scan.
    expect(decodeTieredCursor(encodeTieredCursor({ tier: 0, createdAt, id: "x" }))!.tier).toBe(0);
    expect(decodeTieredCursor(null)).toBeNull();
  });

  it("rejects garbage, plain cursors and negative or non-integer tiers", () => {
    expect(decodeTieredCursor("not-base64")).toBeNull();
    // A plain two-part cursor has no tier and must not silently decode.
    expect(decodeTieredCursor(encodeCursor({ createdAt, id: "abc" }))).toBeNull();
    expect(decodeTieredCursor(Buffer.from(`-1|${createdAt.toISOString()}|a`).toString("base64url"))).toBeNull();
    expect(decodeTieredCursor(Buffer.from(`1.5|${createdAt.toISOString()}|a`).toString("base64url"))).toBeNull();
    expect(decodeTieredCursor(Buffer.from(`0|not-a-date|a`).toString("base64url"))).toBeNull();
  });

  it("emits a cursor carrying the tier the last row came from", () => {
    const rows = [
      { id: "a", createdAt, tier: 0 },
      { id: "b", createdAt, tier: 0 },
      // Sentinel: page size is 2, so this only signals that more exist.
      { id: "c", createdAt, tier: 1 },
    ];
    const page = toTieredPage(rows, 2);
    expect(page.items.map((i) => i.id)).toEqual(["a", "b"]);
    // Resume from the end of tier 0, not the start of tier 1 — tier 0 may still
    // have rows the page simply didn't reach.
    expect(decodeTieredCursor(page.nextCursor)!.tier).toBe(0);
    expect(decodeTieredCursor(page.nextCursor)!.id).toBe("b");
  });

  it("strips the internal tier field from returned items", () => {
    const page = toTieredPage([{ id: "a", createdAt, tier: 1 }], 10);
    expect(page.items[0]).not.toHaveProperty("tier");
    expect(page.nextCursor).toBeNull();
  });

  it("resumes into the next tier once the last page ends a bucket", () => {
    // Last row of a full page came from tier 1 — the next request must continue
    // in tier 1 rather than restarting at the top of tier 0.
    const page = toTieredPage(
      [
        { id: "a", createdAt, tier: 1 },
        { id: "b", createdAt, tier: 1 },
      ],
      1,
    );
    expect(decodeTieredCursor(page.nextCursor)!.tier).toBe(1);
  });
});
