/**
 * Upload constraints shared by the client (pre-validation UX) and the server
 * (authoritative enforcement). No node imports — safe in the browser bundle.
 */
export const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const VIDEO_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export const MAX_IMAGES_PER_POST = 6;

export const ACCEPT_IMAGE = Object.keys(IMAGE_MIME).join(",");
export const ACCEPT_VIDEO = Object.keys(VIDEO_MIME).join(",");

export function classifyUpload(mime: string): "IMAGE" | "VIDEO" | null {
  if (mime in IMAGE_MIME) return "IMAGE";
  if (mime in VIDEO_MIME) return "VIDEO";
  return null;
}

export function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}
