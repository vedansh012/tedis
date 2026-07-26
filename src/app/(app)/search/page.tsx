"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { InterestIcon } from "@/components/interest-icon";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

function SearchInner() {
  const initial = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(initial);
  // Debounce so we fire one search after the user pauses, not per keystroke.
  const [debounced, setDebounced] = useState(initial);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  const results = trpc.search.global.useQuery(
    { query: debounced },
    { enabled: debounced.trim().length >= 2, staleTime: 10_000 },
  );

  const data = results.data;
  const totalResults = data
    ? data.users.length + data.posts.length + data.projects.length + data.interests.length + data.communities.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, projects, topics, communities…"
          aria-label="Search"
          className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </div>

      {query.trim().length < 2 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Type at least 2 characters to search.</p>
      ) : results.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : totalResults === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="space-y-6">
          {data!.interests.length > 0 && (
            <Group title="Interests">
              {data!.interests.map((u) => (
                <Link key={u.slug} href={`/interest/${u.slug}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-foreground/20">
                  <span className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: (u.accentColor ?? "#7c5cff") + "1a", color: u.accentColor ?? "#7c5cff" }}>
                    <InterestIcon iconKey={u.iconKey} size={18} />
                  </span>
                  <div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.membersCount.toLocaleString()} builders</p></div>
                </Link>
              ))}
            </Group>
          )}

          {data!.users.length > 0 && (
            <Group title="People">
              {data!.users.map((u) => (
                <Link key={u.id} href={`/u/${u.username}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-foreground/20">
                  <Avatar src={u.profile?.avatarUrl} name={u.displayName} size={36} />
                  <div className="min-w-0"><p className="truncate font-medium">{u.displayName}</p><p className="truncate text-xs text-muted-foreground">{u.profile?.headline ?? `@${u.username}`}</p></div>
                </Link>
              ))}
            </Group>
          )}

          {data!.projects.length > 0 && (
            <Group title="Projects">
              {data!.projects.map((p) => (
                <Link key={p.slug} href={`/projects/${p.slug}`} className="block rounded-xl border border-border bg-card p-3 hover:border-foreground/20">
                  <p className="font-medium">{p.name}</p>
                  {p.tagline && <p className="truncate text-xs text-muted-foreground">{p.tagline}</p>}
                </Link>
              ))}
            </Group>
          )}

          {data!.posts.length > 0 && (
            <Group title="Posts">
              {data!.posts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-foreground/20">
                  <Avatar src={post.author.profile?.avatarUrl} name={post.author.displayName} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{post.body}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {post.author.displayName}
                      {post.project && <> · in {post.project.name}</>}
                    </p>
                  </div>
                </Link>
              ))}
            </Group>
          )}

          {data!.communities.length > 0 && (
            <Group title="Communities">
              {data!.communities.map((c) => (
                <Link key={c.slug} href={`/communities/${c.slug}`} className="block rounded-xl border border-border bg-card p-3 hover:border-foreground/20">
                  <p className="font-medium">{c.name}</p>
                  {c.purpose && <p className="truncate text-xs text-muted-foreground">{c.purpose}</p>}
                </Link>
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="stagger space-y-2">{children}</div>
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-12 rounded-xl" />}>
      <SearchInner />
    </Suspense>
  );
}
