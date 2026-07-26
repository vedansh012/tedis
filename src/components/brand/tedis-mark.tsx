import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The TedIS brand mark. The source PNG has a baked-in background, so we round
 * the corners to present it as an app-icon tile. `float` adds the slow vertical
 * bob (disabled automatically under prefers-reduced-motion via globals.css).
 */
export function TedisMark({
  size = 40,
  float = false,
  className,
  priority = false,
}: {
  size?: number;
  float?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/tedis-logo.png"
      alt="TedIS"
      width={size}
      height={size}
      priority={priority}
      className={cn(
        "select-none rounded-xl object-cover shadow-sm",
        float && "animate-float will-change-transform",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
