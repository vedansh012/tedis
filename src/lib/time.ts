/** Compact relative time: "now", "5m", "3h", "2d", "4w", or a date. */
export function timeAgo(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 45) return "now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
