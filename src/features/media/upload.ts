import { CSRF_COOKIE, CSRF_HEADER } from "@/features/auth/constants";
import { classifyUpload, IMAGE_MIME, VIDEO_MIME, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, humanSize } from "./constants";

export interface UploadedMedia {
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : undefined;
}

/** Client-side guard so we fail fast before hitting the network. */
export function validateFile(file: File): string | null {
  const kind = classifyUpload(file.type);
  if (!kind) return "Unsupported file type.";
  if (kind === "IMAGE" && file.size > MAX_IMAGE_BYTES) return `Images must be under ${humanSize(MAX_IMAGE_BYTES)}.`;
  if (kind === "VIDEO" && file.size > MAX_VIDEO_BYTES) return `Videos must be under ${humanSize(MAX_VIDEO_BYTES)}.`;
  return null;
}

export async function uploadFile(file: File): Promise<UploadedMedia> {
  const err = validateFile(file);
  if (err) throw new Error(err);

  const form = new FormData();
  form.append("file", file);
  const csrf = readCookie(CSRF_COOKIE);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: form,
    headers: csrf ? { [CSRF_HEADER]: csrf } : {},
    credentials: "same-origin",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Upload failed. Please try again.");
  }
  return res.json();
}

export const ACCEPT_ALL = [...Object.keys(IMAGE_MIME), ...Object.keys(VIDEO_MIME)].join(",");
