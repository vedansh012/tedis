/**
 * Writes the seeded community: 20 people, 46 posts, their media, comment
 * threads, engagement and follow graph.
 *
 * Idempotent. Every row this creates has a deterministic id derived from its
 * corpus key (`seed:post:<key>` and friends), so a second run updates the same
 * rows instead of producing a second community. That also means the seeded
 * content can be removed with a single prefix match, and — critically — this can
 * never touch a row it did not create, including the real accounts that already
 * exist in a developer's local database.
 *
 * Counter policy (worth understanding before changing any number here):
 *   - `commentsCount` is written from the real comment rows, because the UI
 *     lists comments and a mismatch would be visible immediately.
 *   - `followingCount` likewise — the profile has a "Following" tab that
 *     enumerates the actual rows.
 *   - `followersCount`, `reactionsCount`, `bookmarksCount` and `sharesCount` are
 *     set to realistic community-scale values. Twenty accounts can only produce
 *     nineteen real likes, which would make every post look dead. Nothing in the
 *     UI enumerates who liked, saved or shared a post, so these read as intended
 *     and stay consistent: the services only ever increment/decrement them, they
 *     are never recomputed from rows.
 * Real interaction rows are still created underneath (as many as twenty accounts
 * allow) so viewer state, "builders helped" and the saved list all behave.
 */

import { randomBytes } from "node:crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../../../src/server/services/auth/password";
import { stream, int, float, chance, pick, pickMany, shuffle, logNormal, humanizeHour } from "../rng";
import { PEOPLE, emailFor, ALL_SKILLS, type Person } from "./people";
import { POSTS, POST_COUNTS, type SeedPost } from "./posts";
import { IMAGES, VIDEOS } from "./media";

/**
 * Prefix for every id this module writes — the seam between seeded and real data.
 *
 * Hyphens, not colons: a post id is a URL path segment (`/posts/<id>`), and any
 * character that percent-encodes will round-trip badly through the router. Every
 * character here is RFC 3986 unreserved, so a seeded permalink behaves exactly
 * like a cuid one.
 */
const NS = "seed";
const id = (...parts: string[]) => [NS, ...parts].join("-");

/** All timestamps are relative to this so a run is reproducible. */
const NOW = new Date();

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function seedCommunity(prisma: PrismaClient): Promise<void> {
  assertCorpus();

  const interests = await prisma.interest.findMany({ select: { id: true, slug: true } });
  const interestBySlug = new Map(interests.map((i) => [i.slug, i.id]));
  const missing = [...new Set([...PEOPLE.flatMap((p) => p.interests), ...POSTS.map((p) => p.interest)])].filter(
    (s) => !interestBySlug.has(s),
  );
  if (missing.length) {
    throw new Error(`Seed corpus references unknown interests: ${missing.join(", ")}. Seed reference data first.`);
  }

  // ---------------------------------------------------------------- skills --
  const skillIds = new Map<string, string>();
  for (const name of ALL_SKILLS) {
    const slug = slugify(name);
    const skill = await prisma.skill.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
      select: { id: true },
    });
    skillIds.set(name, skill.id);
  }

  // ------------------------------------------------------------------ users --
  // One hash for all twenty: argon2 is intentionally slow and they share a
  // password. Existing seeded accounts keep whatever password they were created
  // with — the credential is only written in the `create` branch below — so a
  // re-run never silently invalidates a password someone wrote down.
  const password = seedPassword();
  const passwordHash = await hashPassword(password.value);
  const existingBefore = await prisma.user.count({ where: { isSeeded: true } });
  const userIds = new Map<string, string>();

  for (const person of PEOPLE) {
    const userId = id("user", person.key);
    const joinedAt = new Date(`${person.joinedAt}T00:00:00Z`);
    const email = emailFor(person);

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        displayName: person.displayName,
        username: person.username,
        email,
        isSeeded: true,
      },
      create: {
        id: userId,
        email,
        username: person.username,
        displayName: person.displayName,
        emailVerified: joinedAt,
        onboardedAt: joinedAt,
        createdAt: joinedAt,
        isSeeded: true,
        password: { create: { hash: passwordHash } },
      },
      select: { id: true },
    });
    userIds.set(person.key, userId);

    await prisma.profile.upsert({
      where: { userId },
      update: profileFields(person),
      create: { userId, createdAt: joinedAt, ...profileFields(person) },
    });

    // Interests — the first is primary, which is what the profile leads with.
    for (const [i, slug] of person.interests.entries()) {
      const interestId = interestBySlug.get(slug)!;
      await prisma.userInterest.upsert({
        where: { userId_interestId: { userId, interestId } },
        update: { isPrimary: i === 0, sortOrder: i },
        create: { userId, interestId, isPrimary: i === 0, sortOrder: i },
      });
    }

    for (const name of person.skills) {
      const skillId = skillIds.get(name)!;
      await prisma.profileSkill.upsert({
        where: { profileId_skillId: { profileId: userId, skillId } },
        update: {},
        create: { profileId: userId, skillId, proofCount: 0 },
      });
    }
  }

  // ---------------------------------------------------------------- follows --
  const edges = buildFollowGraph();
  for (const [followerKey, followingKey] of edges) {
    const followerId = userIds.get(followerKey)!;
    const followingId = userIds.get(followingKey)!;
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });
  }

  // ------------------------------------------------------------------ posts --
  const rng = stream("engagement");
  const otherKeys = (exclude: string) => PEOPLE.map((p) => p.key).filter((k) => k !== exclude);

  for (const post of POSTS) {
    const author = PEOPLE.find((p) => p.key === post.author)!;
    const postId = id("post", post.key);
    const createdAt = humanizeHour(rng, daysBefore(post.daysAgo));

    // Reach: the author's influence sets the scale, the log-normal draw supplies
    // the long tail. A quiet post from a well-followed person still happens.
    const reactionsCount = Math.max(3, Math.round(logNormal(rng, 14 + author.influence * 240, 0.72)));
    const bookmarksCount = Math.round(reactionsCount * float(rng, 0.08, 0.26));
    const sharesCount = Math.round(reactionsCount * float(rng, 0.03, 0.11));
    const commentsCount = post.comments.length;

    const data = {
      authorId: userIds.get(post.author)!,
      type: post.type,
      visibility: "PUBLIC" as const,
      body: post.body,
      interestId: interestBySlug.get(post.interest)!,
      linkUrl: post.linkUrl ?? null,
      gitRepoUrl: post.gitRepoUrl ?? null,
      reactionsCount,
      commentsCount,
      bookmarksCount,
      sharesCount,
      score: Number((author.influence * 0.6 + rng() * 0.4).toFixed(4)),
      isSeeded: true,
    };

    await prisma.post.upsert({
      where: { id: postId },
      update: data,
      create: { id: postId, createdAt, updatedAt: createdAt, ...data },
      select: { id: true },
    });

    // Media is replaced wholesale rather than diffed — it is derived entirely
    // from the corpus, so recreating it is both simpler and self-healing.
    await prisma.postMedia.deleteMany({ where: { postId } });
    const media = mediaRowsFor(post);
    if (media.length) {
      await prisma.postMedia.createMany({ data: media.map((m) => ({ ...m, postId })) });
    }

    // ------------------------------------------------------------ comments --
    const commentIds: string[] = [];
    for (const [i, comment] of post.comments.entries()) {
      const commentId = id("comment", post.key, String(i));
      const at = new Date(createdAt.getTime() + comment.hoursAfter * 60 * 60 * 1000);
      const parentId =
        comment.replyTo !== undefined && commentIds[comment.replyTo] ? commentIds[comment.replyTo]! : null;
      const reactions = Math.max(0, Math.round(logNormal(rng, 3.5, 0.9)) - 1);

      await prisma.comment.upsert({
        where: { id: commentId },
        update: { body: comment.body, reactionsCount: reactions, isSeeded: true },
        create: {
          id: commentId,
          postId,
          authorId: userIds.get(comment.author)!,
          body: comment.body,
          parentId,
          reactionsCount: reactions,
          isSeeded: true,
          createdAt: at,
          updatedAt: at,
        },
        select: { id: true },
      });
      commentIds.push(commentId);

      // Real reactions on the comment, capped by how many accounts exist.
      const commentReactors = pickMany(rng, otherKeys(comment.author), Math.min(reactions, 6));
      for (const key of commentReactors) {
        await upsertReaction(prisma, userIds.get(key)!, "COMMENT", commentId, at);
      }
    }

    // ---------------------------------------------------------- engagement --
    // Real rows for as many accounts as exist; the counters above carry the rest.
    const reactorKeys = pickMany(rng, otherKeys(post.author), Math.min(reactionsCount, PEOPLE.length - 1));
    for (const key of reactorKeys) {
      const at = new Date(createdAt.getTime() + int(rng, 20, 60 * 40) * 60 * 1000);
      await upsertReaction(prisma, userIds.get(key)!, "POST", postId, at);
    }

    const saverKeys = pickMany(rng, otherKeys(post.author), Math.min(bookmarksCount, 8));
    for (const key of saverKeys) {
      const userId = userIds.get(key)!;
      await prisma.bookmark.upsert({
        where: { userId_targetType_targetId: { userId, targetType: "POST", targetId: postId } },
        update: {},
        create: { userId, targetType: "POST", targetId: postId, createdAt },
      });
    }

    const sharerKeys = pickMany(rng, otherKeys(post.author), Math.min(sharesCount, 5));
    for (const [i, key] of sharerKeys.entries()) {
      const shareId = id("share", post.key, String(i));
      await prisma.postShare.upsert({
        where: { id: shareId },
        update: {},
        create: {
          id: shareId,
          postId,
          userId: userIds.get(key)!,
          target: pick(rng, ["COPY_LINK", "COPY_LINK", "NATIVE_SHARE"]),
          createdAt,
        },
      });
    }
  }

  // -------------------------------------------------------------- counters --
  for (const person of PEOPLE) {
    const userId = userIds.get(person.key)!;
    // Following is enumerable in the UI, so it must match the rows exactly.
    const followingCount = await prisma.follow.count({ where: { followerId: userId } });
    const realFollowers = await prisma.follow.count({ where: { followingId: userId } });
    const projectsCount = await prisma.project.count({ where: { ownerId: userId } });

    await prisma.profile.update({
      where: { userId },
      data: { followersCount: Math.max(realFollowers, followerCountFor(person)), followingCount, projectsCount },
    });
  }

  // The reference seed computes member counts before our people exist, so redo them.
  for (const interest of interests) {
    const membersCount = await prisma.userInterest.count({ where: { interestId: interest.id } });
    await prisma.interest.update({ where: { id: interest.id }, data: { membersCount } });
  }

  console.log(
    `  ${PEOPLE.length} people · ${POSTS.length} posts ` +
      `(${POST_COUNTS.withImages} image, ${POST_COUNTS.withVideo} video, ${POST_COUNTS.textOnly} text) · ` +
      `${POST_COUNTS.comments} comments · ${edges.length} follows`,
  );
  if (existingBefore === 0) {
    console.log(`\n  Sign in as any of them:  <username>@seed.tedis.invalid`);
    console.log(`  Password: ${password.value}`);
    if (password.generated) {
      console.log(`  ^ generated, shown once and not stored anywhere. Save it now, or set`);
      console.log(`    SEED_PASSWORD to choose your own before the first run.`);
    }
  } else {
    console.log(`\n  Seeded accounts already existed — their password is unchanged.`);
    console.log(`  To set a new one, delete them first: pnpm tsx scripts/purge-seed.ts`);
  }
}

/**
 * The password every seeded account shares.
 *
 * Generated by default rather than hard-coded, because these are real, working
 * accounts: on a public deployment a shared literal like "Password123!" is 20
 * live identities behind a password a bot will find. `SEED_PASSWORD` overrides
 * it, which is what you want locally — pin it and the accounts stay convenient.
 *
 * The value is never persisted; only the argon2 hash reaches the database, and
 * an existing account's credential is never rewritten. So it is printed exactly
 * once, on the run that creates the accounts.
 */
function seedPassword(): { value: string; generated: boolean } {
  const override = process.env.SEED_PASSWORD;
  if (override) return { value: override, generated: false };
  // 32 chars of base64url from the CSPRNG — comfortably beyond guessing, and it
  // satisfies the app's own password rules (a letter and a digit are near-certain
  // at this length, and the suffix guarantees both).
  const raw = randomBytes(24).toString("base64url").slice(0, 30);
  return { value: `${raw}a7`, generated: true };
}

function profileFields(person: Person) {
  return {
    headline: person.headline,
    bio: person.bio,
    location: person.location,
    company: person.company,
    experienceLevel: person.experienceLevel,
    websiteUrl: person.websiteUrl,
    githubUrl: `https://github.com/${person.username}`,
    linkedinUrl: `https://www.linkedin.com/in/${person.username}`,
    avatarUrl: person.avatarUrl,
    bannerUrl: person.bannerUrl,
    pronouns: person.pronouns,
  };
}

function mediaRowsFor(post: SeedPost): Prisma.PostMediaCreateManyPostInput[] {
  const rows: Prisma.PostMediaCreateManyPostInput[] = [];
  if (post.video) {
    const v = VIDEOS[post.video];
    rows.push({
      type: "VIDEO",
      url: v.url,
      thumbnailUrl: v.poster.url,
      width: v.poster.width,
      height: v.poster.height,
      durationSec: v.durationSec,
      altText: v.alt,
      sortOrder: 0,
    });
  }
  for (const [i, key] of (post.images ?? []).entries()) {
    const image = IMAGES[key];
    rows.push({
      type: "IMAGE",
      url: image.url,
      width: image.width,
      height: image.height,
      altText: image.alt,
      sortOrder: rows.length + i,
    });
  }
  return rows;
}

async function upsertReaction(
  prisma: PrismaClient,
  userId: string,
  targetType: "POST" | "COMMENT",
  targetId: string,
  createdAt: Date,
): Promise<void> {
  await prisma.reaction.upsert({
    where: {
      userId_targetType_targetId_kind: { userId, targetType, targetId, kind: "RESPECT" },
    },
    update: {},
    create: { userId, targetType, targetId, kind: "RESPECT", createdAt },
  });
}

/**
 * Follower count for the profile header.
 *
 * Cubed influence gives the heavy tail a real community has: the most-followed
 * person here lands in the low thousands while a first-year student has a couple
 * of hundred, and nobody sits at a suspiciously round number.
 */
function followerCountFor(person: Person): number {
  const rng = stream(`followers:${person.key}`);
  return Math.round(40 + Math.pow(person.influence, 3.2) * 5200 * float(rng, 0.72, 1.34));
}

/**
 * Who follows whom.
 *
 * Three forces, in order of strength: reach (people follow the well-followed),
 * shared interests (the graph should cluster by topic, not be uniform noise),
 * and a few explicit affinities — students follow senior engineers, founders
 * follow the AI people. Everyone ends up following at least three others so no
 * account has an empty home feed.
 */
function buildFollowGraph(): Array<[string, string]> {
  const rng = stream("follows");
  const edges = new Set<string>();

  const affinity = (a: Person, b: Person): number => {
    const shared = a.interests.filter((i) => b.interests.includes(i)).length;
    let p = 0.06 + b.influence * 0.5 + shared * 0.14;
    // Students look up to experienced ICs.
    if (a.experienceLevel === "Student" && ["Senior", "Staff", "Principal"].includes(b.experienceLevel)) p += 0.3;
    // Founders keep an eye on the AI builders.
    if (a.experienceLevel === "Founder" && b.interests.includes("ai")) p += 0.28;
    // People in the same city or discipline find each other.
    if (a.location === b.location) p += 0.15;
    return Math.min(0.95, p);
  };

  for (const a of PEOPLE) {
    for (const b of PEOPLE) {
      if (a.key === b.key) continue;
      if (chance(rng, affinity(a, b))) edges.add(`${a.key}|${b.key}`);
    }
  }

  // Guarantee a floor so every seeded account has something in its feed.
  for (const a of PEOPLE) {
    const out = [...edges].filter((e) => e.startsWith(`${a.key}|`)).length;
    if (out >= 3) continue;
    const targets = shuffle(rng, PEOPLE.filter((p) => p.key !== a.key))
      .sort((x, y) => y.influence - x.influence)
      .slice(0, 3);
    for (const t of targets) edges.add(`${a.key}|${t.key}`);
  }

  return [...edges].map((e) => e.split("|") as [string, string]);
}

/** Fails the run rather than silently seeding a corpus that drifted out of spec. */
function assertCorpus(): void {
  const keys = new Set(PEOPLE.map((p) => p.key));
  const usernames = new Set(PEOPLE.map((p) => p.username));
  if (usernames.size !== PEOPLE.length) throw new Error("Duplicate username in the persona corpus");
  if (keys.size !== PEOPLE.length) throw new Error("Duplicate persona key");

  const postKeys = new Set(POSTS.map((p) => p.key));
  if (postKeys.size !== POSTS.length) throw new Error("Duplicate post key");

  for (const post of POSTS) {
    if (!keys.has(post.author)) throw new Error(`Post ${post.key} has unknown author ${post.author}`);
    for (const c of post.comments) {
      if (!keys.has(c.author)) throw new Error(`Comment on ${post.key} has unknown author ${c.author}`);
    }
    for (const i of post.images ?? []) {
      if (!(i in IMAGES)) throw new Error(`Post ${post.key} references unknown image ${i}`);
    }
    if (post.video && !(post.video in VIDEOS)) throw new Error(`Post ${post.key} references unknown video ${post.video}`);
  }
}
