import { prisma } from "@/server/db/prisma";
import { setUserInterests } from "@/server/services/interest/interest.service";
import { writeAudit } from "@/server/services/audit/audit";
import { verifyPassword } from "@/server/services/auth/password";
import { randomToken } from "@/lib/crypto";

export async function getProfileByUsername(username: string, viewerId?: string) {
  const user = await prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: {
      id: true,
      username: true,
      displayName: true,
      createdAt: true,
      profile: {
        select: {
          headline: true,
          bio: true,
          location: true,
          websiteUrl: true,
          avatarUrl: true,
          bannerUrl: true,
          followersCount: true,
          followingCount: true,
          projectsCount: true,
          skills: { select: { skill: { select: { name: true, slug: true } }, proofCount: true } },
        },
      },
      interests: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        select: { interest: { select: { slug: true, name: true, accentColor: true, iconKey: true } } },
      },
    },
  });
  if (!user) return null;

  const [isFollowing, topInterests, helpedCount] = await Promise.all([
    viewerId
      ? prisma.follow.count({ where: { followerId: viewerId, followingId: user.id } }).then((c) => c > 0)
      : Promise.resolve(false),
    topContributionInterests(user.id),
    helpedPeopleCount(user.id),
  ]);

  return {
    ...user,
    isSelf: viewerId === user.id,
    isFollowing,
    interests: user.interests.map((u) => u.interest),
    // Interests this person actually contributes to (by post volume) — used to
    // frame their follower count as "follow their work in X" rather than clout.
    topInterests,
    // Contribution-anchored motivation signal: distinct people they've helped.
    helpedCount,
  };
}

/** The Interests a user posts in most, newest-weighted. Contribution, not clout. */
async function topContributionInterests(userId: string, limit = 2) {
  const grouped = await prisma.post.groupBy({
    by: ["interestId"],
    where: { authorId: userId, deletedAt: null, interestId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { interestId: "desc" } },
    take: limit,
  });
  const ids = grouped.map((g) => g.interestId).filter((id): id is string => !!id);
  if (ids.length === 0) return [] as { slug: string; name: string; accentColor: string | null }[];
  const interests = await prisma.interest.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, name: true, accentColor: true },
  });
  // Preserve the group order (most-posted first).
  const byId = new Map(interests.map((i) => [i.id, i]));
  return ids.map((id) => byId.get(id)).filter((i): i is NonNullable<typeof i> => !!i)
    .map(({ slug, name, accentColor }) => ({ slug, name, accentColor }));
}

/**
 * Distinct people a user has helped: everyone (other than themselves) who has
 * RESPECTED or commented on their posts. A warm, contribution-based number that
 * rewards being useful — never a popularity metric.
 */
async function helpedPeopleCount(userId: string): Promise<number> {
  const postIds = (
    await prisma.post.findMany({ where: { authorId: userId, deletedAt: null }, select: { id: true } })
  ).map((p) => p.id);
  if (postIds.length === 0) return 0;

  const [reactors, commenters] = await Promise.all([
    prisma.reaction.findMany({
      where: { targetType: "POST", targetId: { in: postIds }, userId: { not: userId } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.comment.findMany({
      where: { postId: { in: postIds }, authorId: { not: userId }, deletedAt: null },
      select: { authorId: true },
      distinct: ["authorId"],
    }),
  ]);
  const people = new Set<string>([...reactors.map((r) => r.userId), ...commenters.map((c) => c.authorId)]);
  return people.size;
}

/**
 * GDPR "right to erasure". Password-confirmed. Revokes sessions, deletes
 * credentials, scrubs profile PII, soft-deletes every post the user authored
 * (so nothing they wrote lingers in public feeds), and anonymizes + soft-
 * deletes the account itself. The freed email/username are randomized so they
 * don't block reuse. Feed queries additionally filter by author.deletedAt as
 * a defensive check for any already-orphaned posts from earlier deletions.
 */
export async function deleteOwnAccount(
  userId: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: "WRONG_PASSWORD" }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: { select: { hash: true } } },
  });
  if (!user?.password) return { ok: false, error: "WRONG_PASSWORD" };
  const valid = await verifyPassword(user.password.hash, password);
  if (!valid) return { ok: false, error: "WRONG_PASSWORD" };

  const anon = randomToken(8).replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
  const now = new Date();
  await prisma.$transaction([
    prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.passwordCredential.deleteMany({ where: { userId } }),
    prisma.profile.updateMany({
      where: { userId },
      data: { bio: null, headline: null, location: null, websiteUrl: null, avatarUrl: null, bannerUrl: null },
    }),
    // Cascade the soft-delete to every post they authored, so the account's
    // content disappears from feeds at the same instant the account does.
    // Only touches rows that were still visible — already-deleted posts keep
    // their original deletedAt for the audit trail.
    prisma.post.updateMany({
      where: { authorId: userId, deletedAt: null },
      data: { deletedAt: now },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "DEACTIVATED",
        deletedAt: now,
        email: `deleted_${anon}@deleted.tedis.local`,
        username: `deleted_${anon}`,
        displayName: "Deleted account",
      },
    }),
  ]);
  await writeAudit({ actorId: userId, action: "account.deleted", targetType: "USER", targetId: userId });
  return { ok: true };
}

export interface UpdateProfileInput {
  displayName?: string;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  avatarUrl?: string | null;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const { displayName, ...profileFields } = input;
  await prisma.$transaction([
    ...(displayName ? [prisma.user.update({ where: { id: userId }, data: { displayName } })] : []),
    prisma.profile.update({ where: { userId }, data: profileFields }),
  ]);
}

export async function isUsernameAvailable(username: string, forUserId?: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  return !existing || existing.id === forUserId;
}

export interface CompleteOnboardingInput {
  username: string;
  headline?: string;
  bio?: string;
  interestIds: string[];
}

export type OnboardingError = "USERNAME_TAKEN";

export async function completeOnboarding(userId: string, input: CompleteOnboardingInput) {
  if (!(await isUsernameAvailable(input.username, userId))) {
    return { ok: false as const, error: "USERNAME_TAKEN" as OnboardingError };
  }

  await setUserInterests(userId, input.interestIds);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { username: input.username, onboardedAt: new Date() },
    }),
    prisma.profile.update({
      where: { userId },
      data: { headline: input.headline ?? null, bio: input.bio ?? null },
    }),
  ]);
  await writeAudit({ actorId: userId, action: "onboarding.completed", targetId: userId });
  return { ok: true as const };
}

// ---- social graph ----------------------------------------------------------

export async function follow(followerId: string, followingId: string) {
  if (followerId === followingId) return { following: false };
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existing) return { following: true };

  // Context for a warmer notification: the Interest the followed person is most
  // known for that the follower also cares about (falls back to their top one).
  const contextInterest = await followContextInterest(followerId, followingId);

  await prisma.$transaction([
    prisma.follow.create({ data: { followerId, followingId } }),
    prisma.profile.update({ where: { userId: followingId }, data: { followersCount: { increment: 1 } } }),
    prisma.profile.update({ where: { userId: followerId }, data: { followingCount: { increment: 1 } } }),
    prisma.notification.create({
      data: {
        recipientId: followingId,
        actorId: followerId,
        type: "FOLLOW",
        groupKey: `follow:${followingId}`,
        data: contextInterest ? { interestName: contextInterest } : undefined,
      },
    }),
  ]);
  return { following: true };
}

/** Pick a shared Interest (follower ∩ followed) for follow-notification context. */
async function followContextInterest(followerId: string, followingId: string): Promise<string | null> {
  const [mine, theirs] = await Promise.all([
    topContributionInterests(followingId, 3),
    prisma.userInterest.findMany({ where: { userId: followerId }, select: { interestId: true } }),
  ]);
  if (mine.length === 0) return null;
  const followerInterestSlugs = new Set(
    (
      await prisma.interest.findMany({
        where: { id: { in: theirs.map((t) => t.interestId) } },
        select: { slug: true },
      })
    ).map((i) => i.slug),
  );
  const shared = mine.find((i) => followerInterestSlugs.has(i.slug));
  return (shared ?? mine[0])?.name ?? null;
}

export async function unfollow(followerId: string, followingId: string) {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (!existing) return { following: false };
  await prisma.$transaction([
    prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId } } }),
    prisma.profile.update({ where: { userId: followingId }, data: { followersCount: { decrement: 1 } } }),
    prisma.profile.update({ where: { userId: followerId }, data: { followingCount: { decrement: 1 } } }),
  ]);
  return { following: false };
}

/** The people a given user follows, most-recently-followed first. */
export async function listFollowing(userId: string, limit = 50) {
  const edges = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      following: {
        select: {
          id: true,
          username: true,
          displayName: true,
          profile: { select: { headline: true, avatarUrl: true } },
          interests: { take: 2, select: { interest: { select: { name: true, accentColor: true } } } },
        },
      },
    },
  });
  return edges.map((e) => e.following);
}

/** People in the viewer's Interests they don't yet follow. */
export async function suggestedPeople(viewerId: string, limit = 8) {
  const interests = await prisma.userInterest.findMany({
    where: { userId: viewerId },
    select: { interestId: true },
  });
  const interestIds = interests.map((u) => u.interestId);
  const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const excludeIds = [viewerId, ...following.map((f) => f.followingId)];

  const rows = await prisma.user.findMany({
    where: {
      deletedAt: null,
      onboardedAt: { not: null },
      id: { notIn: excludeIds },
      interests: interestIds.length ? { some: { interestId: { in: interestIds } } } : undefined,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      profile: { select: { headline: true, avatarUrl: true } },
      interests: { take: 2, select: { interest: { select: { name: true, accentColor: true } } } },
    },
  });
  return rows;
}
