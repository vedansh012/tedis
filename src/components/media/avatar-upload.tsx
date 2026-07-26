"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { uploadFile } from "@/features/media/upload";
import { ACCEPT_IMAGE } from "@/features/media/constants";
import { cn } from "@/lib/utils";

/**
 * Circular avatar with an upload overlay. Uploads the chosen image through the
 * shared /api/upload pipeline and reports the resulting URL via onChange.
 */
export function AvatarUpload({
  url,
  name,
  size = 88,
  onChange,
}: {
  url: string | null;
  name: string;
  size?: number;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const media = await uploadFile(file);
      onChange(media.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label="Change profile photo"
        className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ width: size, height: size }}
      >
        <Avatar src={url} name={name} size={size} />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white transition-opacity",
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {busy ? <Loader2 className="animate-spin" size={22} /> : <Camera size={22} />}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_IMAGE}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">{error}</p>
      ) : (
        <span className="text-xs text-muted-foreground">Tap to change photo</span>
      )}
    </div>
  );
}
