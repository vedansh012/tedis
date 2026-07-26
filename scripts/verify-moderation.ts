/** One-off verification of the trust & safety loop. Run: pnpm tsx scripts/verify-moderation.ts */
import { prisma } from "@/server/db/prisma";
import * as mod from "@/server/services/moderation/moderation.service";
import { homeFeed } from "@/server/services/feed/feed.service";

async function main() {
  const ada = await prisma.user.findFirst({ where: { username: "ada" }, select: { id: true } });
  const linus = await prisma.user.findFirst({ where: { username: "linus" }, select: { id: true } });
  if (!ada || !linus) throw new Error("seed users missing");

  const linusPost = await prisma.post.findFirst({ where: { authorId: linus.id, deletedAt: null }, select: { id: true } });

  const results: Record<string, unknown> = {};

  // 1) Report a post
  const rep = await mod.submitReport(ada.id, { targetType: "POST", targetId: linusPost!.id, reason: "SPAM", details: "test" });
  results.reportSubmitted = rep.ok;

  // 2) Can't report your own
  const adaPost = await prisma.post.findFirst({ where: { authorId: ada.id, deletedAt: null }, select: { id: true } });
  const selfRep = adaPost ? await mod.submitReport(ada.id, { targetType: "POST", targetId: adaPost.id, reason: "SPAM" }) : { ok: true };
  results.selfReportBlocked = selfRep.ok === false;

  // 3) Admin queue shows it
  const queue = await mod.listReports("OPEN");
  const found = queue.find((r) => r.targetId === linusPost!.id);
  results.reportInQueue = !!found;

  // 4) Feed BEFORE block: does ada see linus posts?
  const before = await homeFeed(ada.id, { limit: 30 });
  results.linusVisibleBeforeBlock = before.items.some((p) => p.author.username === "linus");

  // 5) Block linus → feed hides his posts
  await mod.blockUser(ada.id, linus.id);
  results.hiddenIdsIncludeLinus = (await mod.getHiddenUserIds(ada.id)).includes(linus.id);
  const after = await homeFeed(ada.id, { limit: 30 });
  results.linusHiddenAfterBlock = !after.items.some((p) => p.author.username === "linus");

  // 6) Resolve the report
  if (found) await mod.resolveReport(ada.id, found.id, "RESOLVED");
  const openAfter = await mod.listReports("OPEN");
  results.reportResolved = !openAfter.some((r) => r.id === found?.id);

  // cleanup: unblock + delete the test report
  await mod.unblockUser(ada.id, linus.id);
  if (found) await prisma.report.deleteMany({ where: { id: found.id } });
  results.cleanedUp = !(await mod.getHiddenUserIds(ada.id)).includes(linus.id);

  console.log(JSON.stringify(results, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
