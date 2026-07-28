/**
 * One-off migration for the introduction of mandatory email verification.
 *
 * Accounts created before the gate existed have `emailVerified: null`, which the
 * new `login()` refuses — so without this they would be silently locked out of
 * their own accounts. They registered under the previous contract, so we
 * grandfather them in rather than forcing a re-verification of addresses we
 * already accepted.
 *
 * Idempotent: re-running affects nothing, because verified rows are excluded.
 *
 *   pnpm tsx scripts/backfill-email-verified.ts          # dry run
 *   pnpm tsx scripts/backfill-email-verified.ts --apply  # write
 */
import { prisma } from "@/server/db/prisma";

async function main() {
  const apply = process.argv.includes("--apply");

  const pending = await prisma.user.findMany({
    where: { emailVerified: null, deletedAt: null },
    select: { id: true, email: true, username: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    console.log("Nothing to do — every active account already has a verified email.");
    return;
  }

  console.log(`${pending.length} account(s) would be marked verified:\n`);
  for (const u of pending) {
    console.log(`  ${u.email.padEnd(34)} @${u.username.padEnd(18)} created ${u.createdAt.toISOString().slice(0, 10)}`);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
    return;
  }

  const res = await prisma.user.updateMany({
    where: { emailVerified: null, deletedAt: null },
    data: { emailVerified: new Date() },
  });
  console.log(`\n✓ Marked ${res.count} account(s) as verified.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
