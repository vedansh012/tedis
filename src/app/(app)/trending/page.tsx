"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, TrendingUp, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export default function TrendingPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching } = trpc.project.ranking.useQuery(
    { page, pageSize: PAGE_SIZE },
    { staleTime: 30_000 },
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Flame size={17} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Live leaderboard
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Every project, ranked by heat.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Score = weighted Respect, comments, bookmarks, followers &amp; GitHub stars, decayed
            by age. Ship today, climb tonight.
          </p>
        </div>
      </header>

      <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="p-4">
              <Skeleton className="h-16 w-full" />
            </li>
          ))
        ) : data && data.length > 0 ? (
          data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.slug}`}
                className="group flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50"
              >
                <span
                  className={cn(
                    "flex min-w-[42px] justify-end font-mono text-2xl font-bold tabular-nums",
                    p.rank <= 3
                      ? "text-primary"
                      : p.rank <= 10
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {p.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="truncate text-base font-semibold text-foreground group-hover:text-primary">
                      {p.name}
                    </span>
                    {p.interestName ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          color: p.interestAccent ?? "var(--primary)",
                          backgroundColor: (p.interestAccent ?? "#e8590c") + "1a",
                        }}
                      >
                        {p.interestName}
                      </span>
                    ) : null}
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {p.status.toLowerCase()}
                    </span>
                  </div>
                  {p.tagline ? (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                      {p.tagline}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Avatar
                        src={p.ownerAvatarUrl}
                        name={p.ownerDisplayName}
                        size={18}
                      />
                      <span>@{p.ownerUsername}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp size={12} className="text-primary" />
                      <span className="font-medium text-foreground">{p.reactionsCount}</span>
                      Respect
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} />
                      {p.commentsCount}
                    </span>
                  </div>
                </div>

                <div className="hidden text-right md:block">
                  <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {p.score.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    heat
                  </div>
                </div>
              </Link>
            </li>
          ))
        ) : (
          <li className="p-10 text-center text-sm text-muted-foreground">
            No projects to rank yet.
          </li>
        )}
      </ol>

      <nav className="flex items-center justify-between" aria-label="Pagination">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || isFetching}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft size={14} /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page + 1}
          {isFetching ? " · updating…" : ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!data || data.length < PAGE_SIZE || isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Next <ChevronRight size={14} />
        </Button>
      </nav>
    </div>
  );
}
