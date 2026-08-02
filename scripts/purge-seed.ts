/**
 * Remove every row created by the demo seed, leaving real accounts untouched.
 * Run: pnpm tsx scripts/purge-seed.ts [--yes]
 *
 * This is the counterpart to `prisma/seed/community/`. Seeded content is real
 * rows in the same tables as real content, so the ability to take it back out
 * cleanly is what makes it safe to put in front of anyone — including on a
 * production database, where "just reset the database" is not available.
 *
 * The seam is `isSeeded` plus the `seed-` id prefix. Deleting the users cascades
 * to their posts, comments, media, profiles and follows; the two polymorphic
 * tables (reactions, bookmarks) have no foreign key to their target, so they are
 * removed explicitly first. Everything runs in one transaction — a half-purged
 * community is worse than either state.
 *
 * Reference data (interests, skills, technologies) is deliberately kept: it is
 * not demo content, the app needs it, and real users may already be attached.
 */
import { prisma } from "@/server/db/prisma";

const ID_PREFIX = "seed-";

async function main() {
  const confirmed = process.argv.includes("--yes");

  const users = await prisma.user.findMany({
    where: { isSeeded: true },
    select: { id: true, username: true },
  });
  const posts = await prisma.post.count({ where: { isSeeded: true } });
  const comments = await prisma.comment.count({ where: { isSeeded: true } });

  if (users.length === 0 && posts === 0) {
    console.log("Nothing to purge — no seeded rows found.");
    return;
  }

  // Guard against ever touching a real account: a row must carry BOTH the flag
  // and the id prefix. A real signup can have neither.
  const misflagged = users.filter((u) => !u.id.startsWith(ID_PREFIX));
  if (misflagged.length) {
    throw new Error(
      `Refusing to purge: ${misflagged.length} user(s) are flagged isSeeded but lack the "${ID_PREFIX}" id prefix ` +
        `(${misflagged.map((u) => u.username).join(", ")}). Investigate before deleting anything.`,
    );
  }

  console.log(`Will delete ${users.length} seeded users, ${posts} posts and ${comments} comments.`);
  if (!confirmed) {
    console.log("Dry run. Re-run with --yes to actually delete.");
    return;
  }

  const userIds = users.map((u) => u.id);

  const [reactions, bookmarks] = await prisma.$transaction([
    // Polymorphic: no FK to posts/comments, so cascade will not reach these.
    prisma.reaction.deleteMany({
      where: { OR: [{ userId: { in: userIds } }, { targetId: { startsWith: ID_PREFIX } }] },
    }),
    prisma.bookmark.deleteMany({
      where: { OR: [{ userId: { in: userIds } }, { targetId: { startsWith: ID_PREFIX } }] },
    }),
    // Posts and comments authored by a seeded user cascade from the user delete,
    // but seeded content could in principle hang off a real account — take both.
    prisma.comment.deleteMany({ where: { isSeeded: true } }),
    prisma.post.deleteMany({ where: { isSeeded: true } }),
    prisma.user.deleteMany({ where: { isSeeded: true, id: { startsWith: ID_PREFIX } } }),
  ]);

  // Member counts were recomputed to include seeded people; put them back.
  const interests = await prisma.interest.findMany({ select: { id: true } });
  for (const interest of interests) {
    const membersCount = await prisma.userInterest.count({ where: { interestId: interest.id } });
    await prisma.interest.update({ where: { id: interest.id }, data: { membersCount } });
  }

  console.log(`✓ Purged. Removed ${reactions.count} reactions and ${bookmarks.count} bookmarks alongside the users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
