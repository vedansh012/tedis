import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

/** Avatar with initials fallback. Deterministic background from the name. */
export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const hue = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        // `unoptimized` because uploaded media is served from our /api/media route,
        // which the Next image optimizer doesn't reliably proxy.
        <Image src={src} alt={name} width={size} height={size} unoptimized className="h-full w-full object-cover" />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center font-medium text-white"
          style={{ backgroundColor: `hsl(${hue} 55% 45%)`, fontSize: size * 0.4 }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
