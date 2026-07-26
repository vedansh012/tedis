/** Sets a demo avatar via the real storage pipeline, to verify avatar rendering. */
import sharp from "sharp";
import { prisma } from "@/server/db/prisma";
import { storeUpload } from "@/server/services/media/storage";

async function main() {
  const email = process.argv[2] ?? "sam@demo.test";
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, displayName: true } });
  if (!user) throw new Error(`no user ${email}`);

  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF6B00"/><stop offset="1" stop-color="#ff9d4d"/></linearGradient></defs>
    <rect width="400" height="400" fill="url(#g)"/>
    <text x="200" y="250" font-family="sans-serif" font-size="180" fill="white" text-anchor="middle" font-weight="bold">S</text>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const res = await storeUpload(buf, "image/png");
  if (!res.ok) throw new Error(res.error);

  await prisma.profile.update({ where: { userId: user.id }, data: { avatarUrl: res.media.url } });
  console.log(`✅ ${user.displayName} avatar → ${res.media.url}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
