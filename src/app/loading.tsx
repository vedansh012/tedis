import { TedisMark } from "@/components/brand/tedis-mark";

/** Root splash shown during initial load / route transitions. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <TedisMark size={72} float priority />
      <span
        aria-hidden
        className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
      />
      <span className="sr-only">Loading TedIS…</span>
    </div>
  );
}
