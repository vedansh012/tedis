import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
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
 * Largest slice served for one range request. Browsers routinely open a video
 * with `Range: bytes=0-` (i.e. "the whole thing"); honouring that literally
 * meant one 95MB video cost ~95MB of process memory per viewer, and a handful
 * of concurrent viewers could exhaust a small container. Returning fewer bytes
 * than requested is explicitly allowed for 206 responses (RFC 9110 §15.3.7) —
 * the player simply issues follow-up ranges as it plays.
 */
const MAX_RANGE_CHUNK = 4 * 1024 * 1024; // 4 MiB

/** Node file stream -> Web stream, so bytes flow to the socket without ever
 *  being fully resident in memory. */
function fileStream(filePath: string, start: number, end: number): ReadableStream<Uint8Array> {
  return Readable.toWeb(
    createReadStream(filePath, { start, end }),
  ) as unknown as ReadableStream<Uint8Array>;
}

/**
 * Serves stored media. Streams by byte-range when requested (so `<video>`
 * seeking works). The filename is strictly validated so `..`/slashes can't
 * escape the upload directory.
 *
 * Every response body is a stream — nothing is buffered whole, so peak memory
 * is bounded by the stream's high-water mark rather than by the file size.
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
  if (!fileStat.isFile()) return new Response("Not found", { status: 404 });

  const size = fileStat.size;
  const cache = "public, max-age=31536000, immutable";
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const requestedEnd = match[2] ? parseInt(match[2], 10) : size - 1;
      if (Number.isNaN(start) || start > requestedEnd || start >= size) {
        return new Response("Range not satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
        });
      }
      // Clamp to the file end *and* to our per-response ceiling.
      const end = Math.min(requestedEnd, size - 1, start + MAX_RANGE_CHUNK - 1);
      const chunkSize = end - start + 1;

      return new Response(fileStream(filePath, start, end), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": cache,
        },
      });
    }
  }

  // No Range header: stream the whole file rather than reading it into a Buffer.
  return new Response(fileStream(filePath, 0, size - 1), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
    },
  });
}
