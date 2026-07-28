"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { InterestIcon } from "@/components/interest-icon";
import dynamic from "next/dynamic";

// Split out: only needed once the user taps "Suggest an interest".
const SuggestInterestDialog = dynamic(
  () => import("@/components/interest/suggest-interest-dialog").then((m) => m.SuggestInterestDialog),
  { ssr: false },
);
import { ProjectCard } from "@/components/project/project-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/profile/follow-button";

const DEFAULT_ACCENT = "#e8590c";

export default function ExplorePage() {
  const interests = trpc.interest.list.useQuery();
  const trending = trpc.project.trending.useQuery({ limit: 6 });
  const people = trpc.profile.suggested.useQuery();

  const [query, setQuery] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = interests.data ?? [];
    if (!q) return all;
    return all.filter((u) => u.name.toLowerCase().includes(q) || (u.tagline ?? "").toLowerCase().includes(q));
  }, [interests.data, query]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
          <p className="text-sm text-muted-foreground">Find your topics, discover work, and meet builders.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setSuggesting(true)} className="gap-1.5">
          <Sparkles size={15} />
          Suggest an interest
        </Button>
      </header>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Interests {interests.data ? `· ${interests.data.length}` : ""}
          </h2>
          <div className="relative w-full max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search interests…"
              aria-label="Search interests"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
        </div>

        {interests.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((u) => {
              const accent = u.accentColor ?? DEFAULT_ACCENT;
              return (
                <Link
                  key={u.id}
                  href={`/interest/${u.slug}`}
                  className="group relative flex flex-col gap-2.5 overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                    style={{ backgroundColor: accent + "1a", color: accent }}
                  >
                    <InterestIcon iconKey={u.iconKey} size={20} />
                  </span>
                  <span className="font-medium leading-tight group-hover:text-primary">{u.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {u.membersCount.toLocaleString()} {u.membersCount === 1 ? "builder" : "builders"}
                  </span>
                </Link>
              );
            })}

            {/* Inline "suggest" affordance — always the last tile. */}
            <button
              onClick={() => setSuggesting(true)}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-4 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                <Plus size={20} />
              </span>
              <span className="text-sm font-medium">Suggest an interest</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-medium">No interest matches “{query}”.</p>
            <p className="mt-1 text-sm text-muted-foreground">Think it belongs on TedIS? Suggest it.</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setSuggesting(true)}>
              <Sparkles size={15} /> Suggest “{query.trim()}”
            </Button>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Trending work</h2>
        {trending.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : trending.data && trending.data.length > 0 ? (
          <div className="stagger grid gap-3 sm:grid-cols-2">
            {trending.data.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No projects yet — be the first to ship one.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">People to follow</h2>
        {people.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : people.data && people.data.length > 0 ? (
          <div className="stagger space-y-2">
            {people.data.map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Link
                  href={`/u/${person.username}`}
                  aria-label={`${person.displayName}'s profile`}
                  className="shrink-0"
                >
                  <Avatar src={person.profile?.avatarUrl} name={person.displayName} size={40} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${person.username}`} className="flex min-h-touch items-center truncate font-medium hover:underline">
                    {person.displayName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.profile?.headline ?? `@${person.username}`}
                  </p>
                </div>
                <FollowButton userId={person.id} initialFollowing={false} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Follow more interests to meet people building nearby.</p>
        )}
      </section>

      {suggesting && <SuggestInterestDialog onClose={() => setSuggesting(false)} />}
    </div>
  );
}
