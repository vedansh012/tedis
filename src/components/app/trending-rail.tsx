"use client";

import Link from "next/link";
import { Flame, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Desktop-only right rail. Shown at ≥1440px in the space the shell already
 * reserves; hidden below so mobile/tablet layouts are untouched.
 */
export function TrendingRail() {
  const { data, isLoading } = trpc.project.trendingPanel.useQuery(
    { limit: 8 },
    { refetchOnWindowFocus: false, staleTime: 60_000 },
  );

  return (
    <aside
      aria-label="Trending projects"
      className="fixed right-0 top-0 hidden h-dvh w-[320px] flex-col overflow-y-auto border-l border-border bg-background/60 px-5 py-6 pr-[calc(1.25rem+env(safe-area-inset-right))] pt-[calc(1.5rem+env(safe-area-inset-top))] backdrop-blur wide:flex"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Flame size={15} />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Trending</h2>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Ranked build-log heat
            </p>
          </div>
        </div>
        <Link
          href="/trending"
          className="text-xs font-medium text-primary hover:underline"
        >
          See all
        </Link>
      </div>

      <ol className="flex flex-col gap-1">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-14 animate-pulse rounded-lg bg-secondary/50" />
          ))
        ) : data && data.length > 0 ? (
          data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.slug}`}
                className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/60"
              >
                <span
                  className={cn(
                    "mt-0.5 min-w-[22px] text-right font-mono text-sm font-semibold tabular-nums",
                    p.rank <= 3 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {p.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                      {p.name}
                    </span>
                  </div>
                  {p.tagline ? (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{p.tagline}</p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Avatar src={p.ownerAvatarUrl} name={p.ownerDisplayName} size={16} />
                    <span className="truncate">@{p.ownerUsername}</span>
                    <span className="ml-auto flex items-center gap-1 font-medium text-foreground/70">
                      <TrendingUp size={11} className="text-primary" />
                      {p.reactionsCount}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))
        ) : (
          <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            No projects yet — be the first to ship.
          </li>
        )}
      </ol>

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Score = weighted Respect, comments, bookmarks, followers & stars, decayed by age.
      </p>
    </aside>
  );
}
