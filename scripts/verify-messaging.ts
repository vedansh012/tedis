/** End-to-end verification of 1-on-1 chat. Run: pnpm tsx scripts/verify-messaging.ts */
import { prisma } from "@/server/db/prisma";
import { redis } from "@/server/db/redis";
import { userChannel } from "@/server/services/messaging/realtime";
import * as chat from "@/server/services/messaging/messaging.service";
import * as mod from "@/server/services/moderation/moderation.service";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [ada, linus, grace] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { username: "ada" }, select: { id: true } }),
    prisma.user.findFirstOrThrow({ where: { username: "linus" }, select: { id: true } }),
    prisma.user.findFirstOrThrow({ where: { username: "grace" }, select: { id: true } }),
  ]);
  const R: Record<string, unknown> = {};

  // 1) Open a DM (idempotent + race-safe on directKey)
  const c1 = await chat.getOrCreateDirect(ada.id, linus.id);
  const c2 = await chat.getOrCreateDirect(linus.id, ada.id); // reversed order → same thread
  R.oneThreadPerPair = c1.id === c2.id;
  const convoId = c1.id;

  // 2) Realtime: subscribe to linus's channel, then ada sends → linus receives
  const sub = redis.duplicate();
  let rtEvent: { t?: string; message?: { body?: string } } | null = null;
  await sub.subscribe(userChannel(linus.id));
  sub.on("message", (_ch, payload) => (rtEvent = JSON.parse(payload)));

  const msg = await chat.sendMessage(ada.id, convoId, "hey Linus — realtime test");
  await sleep(300);
  R.messagePersisted = !!msg.id;
  R.realtimeDelivered = (rtEvent as { t?: string } | null)?.t === "message";
  R.realtimeBodyMatches = (rtEvent as { message?: { body?: string } } | null)?.message?.body === "hey Linus — realtime test";
  await sub.unsubscribe().catch(() => {});
  sub.disconnect();

  // 3) Linus reads history + sees unread
  const history = await chat.getMessages(linus.id, convoId);
  R.historyVisibleToPeer = history.items.some((m) => m.body === "hey Linus — realtime test");

  const beforeRead = await chat.listConversations(linus.id);
  R.unreadCountedForPeer = (beforeRead.find((c) => c.id === convoId)?.unread ?? 0) >= 1;

  // 4) Mark read → unread clears
  await chat.markRead(linus.id, convoId);
  const afterRead = await chat.listConversations(linus.id);
  R.unreadClearedAfterRead = (afterRead.find((c) => c.id === convoId)?.unread ?? -1) === 0;

  // 5) Authorization: a non-participant (grace) can't read the thread
  R.nonParticipantBlocked = await chat
    .getMessages(grace.id, convoId)
    .then(() => false)
    .catch(() => true);

  // 6) Blocking prevents opening a NEW DM (existing threads aside)
  await mod.blockUser(grace.id, ada.id);
  R.blockedCannotOpenDM = await chat
    .getOrCreateDirect(ada.id, grace.id)
    .then(() => false)
    .catch(() => true);
  await mod.unblockUser(grace.id, ada.id);

  // cleanup
  await prisma.conversation.delete({ where: { id: convoId } }).catch(() => {});
  R.cleanedUp = !(await prisma.conversation.findUnique({ where: { id: convoId }, select: { id: true } }));

  console.log(JSON.stringify(R, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
