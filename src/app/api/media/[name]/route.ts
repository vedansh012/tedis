import { stat, open, readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/server/services/media/storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

/**
 * Serves stored media. Streams by byte-range when requested (so <video> seeking
 * works). The filename is strictly validated so `..`/slashes can't escape the
 * upload directory.
 */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // Only allow simple `<base>.<ext>` names — no separators, no traversal.
  if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(name)) {
    return new Response("Bad request", { status: 400 });
  }
  const ext = name.split(".").pop()!.toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return new Response("Unsupported", { status: 415 });

  const filePath = path.join(UPLOAD_DIR, name);
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const size = fileStat.size;
  const cache = "public, max-age=31536000, immutable";
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : size - 1;
      if (start > end || start >= size) {
        return new Response("Range not satisfiable", { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      const chunkSize = end - start + 1;
      const fh = await open(filePath, "r");
      try {
        const buf = Buffer.alloc(chunkSize);
        await fh.read(buf, 0, chunkSize, start);
        return new Response(buf, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(chunkSize),
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": cache,
          },
        });
      } finally {
        await fh.close();
      }
    }
  }

  const data = await readFile(filePath);
  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
    },
  });
}
