import { cn } from "@/lib/utils";

/** Shimmer placeholder that matches final content dimensions. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}
