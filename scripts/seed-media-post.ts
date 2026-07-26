/**
 * Exercises the real media pipeline end-to-end: generate images with sharp,
 * store them through the production `storeUpload` (validation + re-encode +
 * EXIF strip + disk write), then create a post carrying that media.
 * Verifies the feed will render a real gallery. Run: pnpm tsx scripts/seed-media-post.ts
 */
import sharp from "sharp";
import { prisma } from "@/server/db/prisma";
import { storeUpload } from "@/server/services/media/storage";
import { createPost } from "@/server/services/feed/feed.service";

async function makeImage(r: number, g: number, b: number, label: string): Promise<Buffer> {
  const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="800" fill="rgb(${r},${g},${b})"/>
    <text x="600" y="420" font-family="sans-serif" font-size="64" fill="white" text-anchor="middle" font-weight="bold">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

async function main() {
  const ada = await prisma.user.findUnique({ where: { email: "ada@tedis.dev" }, select: { id: true } });
  if (!ada) throw new Error("Seed user ada@tedis.dev not found — run pnpm db:seed first.");

  const specs = [
    { rgb: [255, 107, 0] as const, label: "TedIS 1" },
    { rgb: [40, 44, 52] as const, label: "TedIS 2" },
    { rgb: [14, 165, 233] as const, label: "TedIS 3" },
  ];

  const media = [];
  for (const s of specs) {
    const buf = await makeImage(s.rgb[0], s.rgb[1], s.rgb[2], s.label);
    const res = await storeUpload(buf, "image/jpeg");
    if (!res.ok) throw new Error(`storeUpload failed: ${res.error}`);
    console.log(`  stored ${res.media.url} (${res.media.width}x${res.media.height})`);
    media.push({ type: res.media.type, url: res.media.url, width: res.media.width, height: res.media.height });
  }

  const post = await createPost(ada.id, {
    body: "Testing the new TedIS media gallery 📸 — three images, click any to open the lightbox.",
    media,
  });
  console.log(`\n✅ Created post ${post.id} with ${post.media.length} images.`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
