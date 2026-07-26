"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { InterestIcon } from "@/components/interest-icon";
import { ProjectCard } from "@/components/project/project-card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/profile/follow-button";

export default function ExplorePage() {
  const interests = trpc.interest.list.useQuery();
  const trending = trpc.project.trending.useQuery({ limit: 6 });
  const people = trpc.profile.suggested.useQuery();

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground">Discover interests, work, and people.</p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Interests</h2>
        {interests.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
            {interests.data?.map((u) => (
              <Link
                key={u.id}
                href={`/interest/${u.slug}`}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
              >
                <span
                  className="flex size-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: (u.accentColor ?? "#7c5cff") + "1a", color: u.accentColor ?? "#7c5cff" }}
                >
                  <InterestIcon iconKey={u.iconKey} size={18} />
                </span>
                <span className="font-medium group-hover:text-primary">{u.name}</span>
                <span className="text-xs text-muted-foreground">
                  {u.membersCount.toLocaleString()} builders · {u.projectsCount} projects
                </span>
              </Link>
            ))}
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
                <Link href={`/u/${person.username}`}>
                  <Avatar src={person.profile?.avatarUrl} name={person.displayName} size={40} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${person.username}`} className="block truncate font-medium hover:underline">
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
    </div>
  );
}
