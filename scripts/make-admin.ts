/**
 * Promote a user to a platform role (bootstrapping the first Super Admin).
 * Run: pnpm tsx scripts/make-admin.ts <email> [ROLE]
 *   ROLE defaults to SUPER_ADMIN. Valid: SUPPORT MODERATOR ADMIN SUPER_ADMIN USER
 *
 * This is intentionally CLI-only — there is no in-app way to mint the first
 * admin, which is the correct bootstrap posture for a production platform.
 */
import { prisma } from "@/server/db/prisma";
import type { UserRole } from "@prisma/client";

const VALID: UserRole[] = ["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] ?? "SUPER_ADMIN") as UserRole;
  if (!email) throw new Error("Usage: pnpm tsx scripts/make-admin.ts <email> [ROLE]");
  if (!VALID.includes(role)) throw new Error(`Invalid role. One of: ${VALID.join(", ")}`);

  const user = await prisma.user.update({
    where: { email },
    data: { role },
    select: { username: true, email: true, role: true },
  });
  console.log(`✓ @${user.username} (${user.email}) is now ${user.role}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
