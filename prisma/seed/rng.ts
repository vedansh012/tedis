/**
 * Deterministic randomness for the seed.
 *
 * Every value the seed generates derives from one root string (SEED_KEY), so
 * two runs against a fresh database produce byte-identical content. That is what
 * makes the generated community reviewable: a reported problem with "the post by
 * @maya_rk about pgvector" is reproducible on any machine, and re-running the
 * seed after a code change produces a diff you can reason about rather than an
 * entirely new universe.
 *
 * `Math.random` is deliberately never used anywhere under prisma/seed/.
 */

/**
 * mulberry32 — a 32-bit PRNG. Chosen over an LCG because the low bits are
 * well-distributed (an LCG's aren't, which shows up as visible banding when you
 * use `next() < p` for rare events), and over a crypto PRNG because we need it
 * to be seedable and repeatable, not unpredictable.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. Turns a namespace string into the 32-bit seed mulberry32 wants. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The root of every seeded value. Override to generate a different — but still
 * reproducible — community, e.g. to preview an alternative content mix.
 */
export const SEED_KEY = process.env.SEED_KEY ?? "tedis.community.v1";

/**
 * A named, independent random stream.
 *
 * Streams are namespaced rather than drawn from one global sequence so that
 * generators stay independent: adding a post format changes the `posts` stream
 * without shifting every persona's avatar colour. Without this, any content edit
 * would reshuffle the entire dataset.
 */
export function stream(namespace: string): Rng {
  return mulberry32(hashString(`${SEED_KEY}::${namespace}`));
}

// ---- primitives -------------------------------------------------------------

/** Integer in [min, max] inclusive. */
export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Float in [min, max). */
export function float(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** True with probability p. */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick() from an empty list");
  return items[Math.floor(rng() * items.length)]!;
}

/** `count` distinct items, or all of them when count >= length. */
export function pickMany<T>(rng: Rng, items: readonly T[], count: number): T[] {
  if (count >= items.length) return shuffle(rng, items);
  return shuffle(rng, items).slice(0, count);
}

/** Fisher-Yates on a copy — never mutates the corpus arrays. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Weighted choice. Weights need not sum to 1. */
export function weighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

// ---- distributions ----------------------------------------------------------

/**
 * Box-Muller standard normal. Used to build the log-normal below; also handy for
 * jittering counts so they don't look uniformly sampled.
 */
export function gaussian(rng: Rng): number {
  // u must be > 0 for log(); mulberry32 can return exactly 0.
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Log-normal — the distribution real engagement actually follows.
 *
 * A uniform 0..10000 like count is the single clearest tell of generated data:
 * it produces far too many mid-sized posts and no long tail. Real feeds are
 * mostly quiet posts with a thin tail of hits, which is what log-normal gives.
 *
 * @param median the 50th percentile (in the same unit as the result)
 * @param sigma  spread in log space; ~1.1 gives a realistic social long tail
 */
export function logNormal(rng: Rng, median: number, sigma: number): number {
  return median * Math.exp(sigma * gaussian(rng));
}

/**
 * Pick a timestamp inside a window, biased toward the recent end.
 *
 * `recencyBias` > 1 pulls samples toward `end`. A community that has been alive
 * for two years but posted most of its content this month is what a growing
 * platform looks like; a flat distribution reads as a bulk import.
 */
export function timestampIn(rng: Rng, start: Date, end: Date, recencyBias = 2.2): Date {
  const span = end.getTime() - start.getTime();
  const t = Math.pow(rng(), 1 / recencyBias);
  return new Date(start.getTime() + t * span);
}

/**
 * A weekday/working-hours-shaped time of day.
 *
 * Timestamps spread uniformly across 24h are another tell — real activity has a
 * daily rhythm. Nudges the given date onto a plausible hour without changing the
 * day, so the ordering established by `timestampIn` is preserved.
 */
export function humanizeHour(rng: Rng, date: Date): Date {
  const hour = weighted(rng, [
    [int(rng, 9, 12), 30], // morning
    [int(rng, 13, 17), 34], // afternoon
    [int(rng, 18, 23), 26], // evening — the "after work, building" window
    [int(rng, 0, 8), 10], // night owls and other timezones
  ]);
  const out = new Date(date);
  out.setHours(hour, int(rng, 0, 59), int(rng, 0, 59), 0);
  return out;
}
