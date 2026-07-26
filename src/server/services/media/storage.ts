import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import type { S3Client } from "@aws-sdk/client-s3"; // type-only: erased at runtime, keeps the SDK lazy
import { serverEnv } from "@/config/env";
import { IMAGE_MIME, VIDEO_MIME, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/features/media/constants";

/**
 * Media storage with two interchangeable backends behind one interface:
 *
 *  • S3/R2 (production)  — used when the S3_* env is configured. Objects are
 *    written to the bucket and served directly from S3_PUBLIC_URL (a CDN/R2
 *    public domain), so bytes never flow through the app process and the app
 *    can scale horizontally.
 *  • Local filesystem (dev / single-VPS fallback) — files under ./storage/
 *    uploads served by the /api/media/[name] route handler.
 *
 * Callers only see StoredMedia.url; they don't care which backend produced it.
 *
 * Security: images are decoded + re-encoded through sharp (magic-byte
 * validation + EXIF strip); size and MIME allow-lists are enforced before we
 * touch the bytes.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
const PUBLIC_PREFIX = "/api/media";
const S3_KEY_PREFIX = "uploads";

export interface StoredMedia {
  url: string;
  type: "IMAGE" | "VIDEO";
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export type UploadError = "UNSUPPORTED_TYPE" | "TOO_LARGE" | "INVALID_FILE";

// ---- S3 / R2 backend (lazy: only touched when configured) -----------------

interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

function s3Config(): S3Config | null {
  const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL } = serverEnv;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_URL) return null;
  return {
    endpoint: serverEnv.S3_ENDPOINT, // set for R2/MinIO; omit for real AWS
    region: serverEnv.S3_REGION ?? "auto",
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    publicUrl: S3_PUBLIC_URL.replace(/\/$/, ""),
  };
}

// Cache the client across requests within a process.
let s3Singleton: S3Client | null = null;
async function getS3(cfg: S3Config) {
  if (s3Singleton) return s3Singleton;
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Singleton = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: !!cfg.endpoint, // R2/MinIO need path-style addressing
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  return s3Singleton;
}

async function persistS3(cfg: S3Config, name: string, data: Buffer, contentType: string): Promise<string> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await getS3(cfg);
  const key = `${S3_KEY_PREFIX}/${name}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${cfg.publicUrl}/${key}`;
}

// ---- filename + backend-selecting persist ---------------------------------

function filename(ext: string): string {
  return `${Date.now().toString(36)}_${randomBytes(9).toString("hex")}.${ext}`;
}

async function persistLocal(name: string, data: Buffer): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), data);
  return `${PUBLIC_PREFIX}/${name}`;
}

/** Write bytes to whichever backend is configured; returns the public URL. */
async function persist(name: string, data: Buffer, contentType: string): Promise<string> {
  const cfg = s3Config();
  return cfg ? persistS3(cfg, name, data, contentType) : persistLocal(name, data);
}

async function storeImage(buffer: Buffer): Promise<StoredMedia> {
  // sharp throws if the bytes aren't a valid image → treated as INVALID_FILE.
  const pipeline = sharp(buffer, { failOn: "truncated" })
    .rotate() // honour EXIF orientation, then strip it
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });

  const { data, info } = await pipeline
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const url = await persist(filename("webp"), data, "image/webp");
  return { url, type: "IMAGE", width: info.width, height: info.height };
}

async function storeVideo(buffer: Buffer, mime: string): Promise<StoredMedia> {
  const ext = VIDEO_MIME[mime]!;
  const url = await persist(filename(ext), buffer, mime);
  return { url, type: "VIDEO" };
}

/**
 * Validate + store one uploaded file. Returns a discriminated result so the
 * route can map failures to precise HTTP statuses.
 */
export async function storeUpload(
  buffer: Buffer,
  mime: string,
): Promise<{ ok: true; media: StoredMedia } | { ok: false; error: UploadError }> {
  const isImage = mime in IMAGE_MIME;
  const isVideo = mime in VIDEO_MIME;
  if (!isImage && !isVideo) return { ok: false, error: "UNSUPPORTED_TYPE" };

  const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (buffer.byteLength > limit) return { ok: false, error: "TOO_LARGE" };

  try {
    const media = isImage ? await storeImage(buffer) : await storeVideo(buffer, mime);
    return { ok: true, media };
  } catch {
    return { ok: false, error: "INVALID_FILE" };
  }
}
