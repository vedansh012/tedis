/** Definitive check: upload a real image through the running dev server's
 * /api/upload route (exercises auth + CSRF + sharp end-to-end). */
import sharp from "sharp";
import { prisma } from "@/server/db/prisma";
import { createSession } from "@/server/services/auth/session";

async function main() {
  const sam = await prisma.user.findUniqueOrThrow({ where: { email: "sam@demo.test" }, select: { id: true } });
  const { token } = await createSession(sam.id, {});
  const csrf = "dev-upload-check";

  const img = await sharp({ create: { width: 240, height: 240, channels: 3, background: { r: 255, g: 107, b: 0 } } }).png().toBuffer();
  const form = new FormData();
  form.append("file", new Blob([img], { type: "image/png" }), "test.png");

  const res = await fetch("http://localhost:3000/api/upload", {
    method: "POST",
    body: form,
    headers: { cookie: `tedis_session=${token}; tedis_csrf=${csrf}`, "x-csrf-token": csrf },
  });
  console.log("HTTP", res.status);
  console.log(await res.text());
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect().catch(() => {}); process.exit(1); });
