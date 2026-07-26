"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Lightbox } from "./lightbox";

export interface MediaItem {
  id: string;
  type: "IMAGE" | "VIDEO" | "GIF";
  url: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

/** Renders a post's media: native video player(s) + a responsive image gallery with lightbox. */
export function PostMedia({ media }: { media: MediaItem[] }) {
  const images = media.filter((m) => m.type === "IMAGE" || m.type === "GIF");
  const videos = media.filter((m) => m.type === "VIDEO");
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (media.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {videos.map((v) => (
        <div key={v.id} className="overflow-hidden rounded-xl border border-border bg-black">
          <video
            src={v.url}
            poster={v.thumbnailUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="max-h-[70vh] w-full bg-black"
          />
        </div>
      ))}

      {images.length > 0 && (
        <div className={cn("grid gap-1.5 overflow-hidden rounded-xl", gridClass(images.length))}>
          {images.map((img, i) => (
            <ImageTile
              key={img.id}
              img={img}
              count={images.length}
              isFirst={i === 0}
              onOpen={() => setLightbox(i)}
            />
          ))}
        </div>
      )}

      {lightbox !== null && (
        <Lightbox
          images={images}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      )}
    </div>
  );
}

/** A single gallery image that gracefully fades in once it has loaded. */
function ImageTile({
  img,
  count,
  isFirst,
  onOpen,
}: {
  img: MediaItem;
  count: number;
  isFirst: boolean;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        count === 1 ? "max-h-[70vh]" : "aspect-square",
        count === 3 && isFirst && "row-span-2",
      )}
    >
      <Image
        src={img.url}
        alt={img.altText ?? ""}
        width={img.width ?? 1200}
        height={img.height ?? 900}
        unoptimized
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full transition-[transform,opacity] duration-500 ease-premium group-hover:scale-[1.02]",
          loaded ? "opacity-100" : "opacity-0",
          count === 1 ? "max-h-[70vh] w-full object-contain" : "object-cover",
        )}
      />
    </button>
  );
}

function gridClass(count: number): string {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-2 grid-rows-2";
  if (count === 4) return "grid-cols-2";
  return "grid-cols-3";
}
