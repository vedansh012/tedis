/**
 * Persona generation.
 *
 * Builds N distinct people by drawing an archetype, then a region, then filling
 * that archetype's templates from its own vocabulary. Each persona gets its own
 * RNG stream keyed by index, so persona #217 is identical across runs even if
 * the count changes — which means a screenshot of a profile stays valid after
 * you regenerate.
 */

import {
  stream,
  mulberry32,
  hashString,
  int,
  pick,
  pickMany,
  chance,
  weighted,
  float,
  timestampIn,
  type Rng,
} from "./rng";
import {
  REGIONS,
  COMPANIES,
  FOCUS_CLAUSES,
  BIO_OPENERS,
  BIO_CLOSERS,
  PRIOR_LIVES,
  ORIGIN_FIELDS,
  PRONOUNS,
} from "./corpus/identity";
import { ARCHETYPES, type Archetype } from "./corpus/archetypes";
import type { CompanyKind, Persona } from "./types";

/** Community start date. Everything else is dated relative to this. */
export const COMMUNITY_START = new Date("2024-09-01T00:00:00Z");
export const NOW = new Date("2026-08-01T00:00:00Z");

/** Topics a persona can talk about beyond their archetype's core list. */
const WILDCARD_TOPICS = ["tech-news", "hackathons", "career", "open-source", "programming"];

function slugifyUsername(given: string, family: string, rng: Rng): string {
  const g = given.toLowerCase().replace(/[^a-z]/g, "");
  const f = family.toLowerCase().replace(/[^a-z]/g, "");
  // Real usernames are inconsistent — some people use their full name, some
  // initials, some a handle with a number. Mirroring that variety matters more
  // than any single format looking good.
  const forms = [
    () => `${g}${f}`,
    () => `${g}_${f}`,
    () => `${g}${f[0]}`,
    () => `${g}${f.slice(0, 3)}`,
    () => `${g[0]}${f}`,
    () => `${g}_${f[0]}${f[1] ?? ""}`,
    () => `${g}${int(rng, 2, 99)}`,
    () => `${g}dev`,
    () => `${g}builds`,
    () => `the${g}`,
  ];
  const base = pick(rng, forms)();
  // usernameSchema: starts with a letter, [a-z0-9_], 3..30.
  const cleaned = base.replace(/[^a-z0-9_]/g, "").slice(0, 28);
  return cleaned.length >= 3 ? cleaned : `${cleaned}dev`;
}

function companyFor(kind: CompanyKind, rng: Rng, _displayName: string): string {
  const pool = COMPANIES[kind];
  const name = pick(rng, pool);
  if (kind !== "university") return name;
  // Students say which year they're in — it's the first thing they mention.
  const year = pick(rng, ["1st year", "2nd year", "3rd year", "Final year", "MS", "PhD"]);
  return `${year} @ ${name}`;
}

function buildBio(rng: Rng, archetype: Archetype, role: string, topic: string): string {
  const parts: string[] = [];

  if (chance(rng, 0.62)) {
    parts.push(
      pick(rng, BIO_OPENERS)
        .replace("{prev}", pick(rng, PRIOR_LIVES))
        .replace("{years}", String(int(rng, 2, 14)))
        .replace("{current}", role.toLowerCase())
        .replace("{origin}", pick(rng, ORIGIN_FIELDS))
        .replace("{field}", pick(rng, ["distributed systems", "ML", "security", "product", "infrastructure"]))
        .replace("{age}", String(int(rng, 24, 34))),
    );
  }

  // The middle sentence is the persona's actual substance — what they work on.
  parts.push(
    pick(rng, [
      `Mostly working on ${topic} these days.`,
      `Spend most of my time on ${topic}.`,
      `${topic} is where I've been living lately.`,
      `Deep in ${topic} at the moment.`,
      `Currently: ${topic}.`,
    ]),
  );

  if (chance(rng, 0.55)) {
    parts.push(pick(rng, BIO_CLOSERS).replace("{topic}", topic));
  }

  return parts.join(" ");
}

/**
 * Influence, 0..1 — how far this person's posts travel.
 *
 * Deliberately skewed low: a community where everyone is equally influential
 * produces uniform engagement, which is the same tell as uniform like counts.
 * Squaring a uniform draw gives a realistic shape — most people are quiet, a few
 * have real reach.
 */
function influenceFor(rng: Rng, archetype: Archetype): number {
  const base = Math.pow(rng(), 2);
  return Math.min(1, base * archetype.reputationScale);
}

export function generatePersonas(count: number): Persona[] {
  const root = stream("personas");
  const archetypeWeights = ARCHETYPES.map((a) => [a, a.weight] as const);
  const regionWeights = REGIONS.map((r) => [r, r.weight] as const);

  const personas: Persona[] = [];
  const usedUsernames = new Set<string>();
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Per-persona stream: stable regardless of how many personas come before it.
    const rng = mulberry32(hashString(`${i}:persona`) ^ hashString(String(root())));
    const archetype = weighted(rng, archetypeWeights);
    const region = weighted(rng, regionWeights);

    // Redraw on collision so 400 people are 400 distinct humans.
    let given = pick(rng, region.given);
    let family = pick(rng, region.family);
    let attempts = 0;
    while (usedNames.has(`${given} ${family}`) && attempts++ < 24) {
      given = pick(rng, region.given);
      family = pick(rng, region.family);
    }
    const displayName = `${given} ${family}`;
    usedNames.add(displayName);

    let username = slugifyUsername(given, family, rng);
    let suffix = 2;
    while (usedUsernames.has(username)) {
      const trimmed = username.slice(0, 26);
      username = `${trimmed}${suffix++}`;
    }
    usedUsernames.add(username);

    const companyKind = weighted(rng, archetype.companies);
    const company = companyFor(companyKind, rng, displayName);
    const role = pick(rng, archetype.roles);
    const experienceLevel = weighted(rng, archetype.levels);

    // Interests: the archetype's own, plus an occasional wildcard so people
    // aren't perfectly sorted into lanes.
    const coreCount = int(rng, 3, 5);
    const interestSlugs = pickMany(rng, archetype.interests, coreCount);

    const topicCount = int(rng, 3, 6);
    const topics = pickMany(rng, archetype.topics, topicCount);
    if (chance(rng, 0.4)) topics.push(pick(rng, WILDCARD_TOPICS));

    const headline = pick(rng, archetype.headlines)
      .replace("{role}", role)
      .replace("{company}", company.replace(/^.*? @ /, ""))
      .replace("{focus}", pick(rng, FOCUS_CLAUSES));

    const bioTopic = pick(rng, [
      "retrieval pipelines", "type systems", "incident response", "design tokens",
      "query planners", "build times", "eBPF", "developer onboarding", "caching",
      "observability", "accessibility", "schema design", "inference latency",
      "CI pipelines", "state machines", "API ergonomics", "test flakiness",
    ]);

    const joinedAt = timestampIn(rng, COMMUNITY_START, NOW, 1.35);
    // Reputation scales with archetype standing and tenure — someone who joined
    // last week has not out-earned a two-year maintainer.
    const tenureMonths = (NOW.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const reputation = Math.round(
      float(rng, 20, 340) * archetype.reputationScale * (0.5 + Math.min(tenureMonths, 22) / 22),
    );

    personas.push({
      key: `p${i}`,
      archetype: archetype.key,
      displayName,
      username,
      // .invalid is reserved by RFC 2606 — these addresses can never route to a
      // real inbox, so a misconfigured mailer cannot email a stranger.
      email: `${username}@seed.tedis.invalid`,
      headline,
      bio: buildBio(rng, archetype, role, bioTopic),
      location: pick(rng, region.cities),
      company,
      experienceLevel,
      pronouns: chance(rng, 0.28) ? pick(rng, PRONOUNS) : null,
      githubUrl: `https://github.com/${username}`,
      linkedinUrl: `https://www.linkedin.com/in/${username}`,
      avatarSeed: `${username}:${i}`,
      skills: pickMany(rng, archetype.skills, int(rng, 2, archetype.skills.length)),
      interestSlugs,
      topics: [...new Set(topics)],
      reputation,
      joinedAt,
      influence: influenceFor(rng, archetype),
    });
  }

  return personas;
}

/**
 * Follow edges.
 *
 * Built as preferential attachment (people follow the already-followed) rather
 * than uniform pairing, because that is what produces the heavy-tailed follower
 * distribution real networks have. Shared interests raise the probability, so
 * the graph clusters by topic instead of being uniform noise.
 */
export function generateFollows(personas: Persona[]): Array<[string, string]> {
  const rng = stream("follows");
  const edges: Array<[string, string]> = [];
  const seen = new Set<string>();
  const followerCount = new Map<string, number>(personas.map((p) => [p.key, 0]));

  for (const person of personas) {
    // How many people they follow — active users follow a lot, lurkers few.
    const outDegree = Math.round(
      Math.min(120, Math.max(2, Math.exp(float(rng, 1.2, 4.1)))),
    );

    // Candidate pool weighted by (existing followers + interest overlap).
    for (let i = 0; i < outDegree; i++) {
      const candidates = pickMany(rng, personas, 12).filter((c) => c.key !== person.key);
      if (candidates.length === 0) continue;

      const scored = candidates.map((c) => {
        const overlap = c.interestSlugs.filter((s) => person.interestSlugs.includes(s)).length;
        // +1 keeps brand-new accounts reachable instead of permanently invisible.
        const weight = (followerCount.get(c.key)! + 1) * (1 + overlap * 1.6) * (0.4 + c.influence);
        return [c, weight] as const;
      });

      const target = weighted(rng, scored);
      const id = `${person.key}->${target.key}`;
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push([person.key, target.key]);
      followerCount.set(target.key, followerCount.get(target.key)! + 1);
    }
  }

  return edges;
}
