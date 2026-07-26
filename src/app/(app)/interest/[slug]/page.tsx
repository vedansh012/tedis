"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { InterestIcon } from "@/components/interest-icon";
import { PostCard } from "@/components/feed/post-card";
import { ProjectCard } from "@/components/project/project-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "feed" | "projects" | "people";

export default function InterestPage() {
  const slug = String(useParams().slug);
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("feed");
  const interest = trpc.interest.bySlug.useQuery({ slug });

  const join = trpc.interest.join.useMutation({ onSuccess: () => utils.interest.invalidate() });
  const leave = trpc.interest.leave.useMutation({ onSuccess: () => utils.interest.invalidate() });

  if (interest.isLoading) return <InterestSkeleton />;
  if (!interest.data) return <p className="py-16 text-center text-muted-foreground">Interest not found.</p>;

  const u = interest.data;

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <span
            className="flex size-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: (u.accentColor ?? "#7c5cff") + "1a", color: u.accentColor ?? "#7c5cff" }}
          >
            <InterestIcon iconKey={u.iconKey} size={28} />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{u.name}</h1>
            {u.tagline && <p className="text-sm text-muted-foreground">{u.tagline}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {u.membersCount.toLocaleString()} builders · {u.projectsCount} projects
            </p>
          </div>
          {u.isMember ? (
            <Button variant="outline" size="sm" onClick={() => leave.mutate({ interestId: u.id })}>
              Joined
            </Button>
          ) : (
            <Button size="sm" onClick={() => join.mutate({ interestId: u.id })}>
              Join
            </Button>
          )}
        </div>
      </header>

      <div className="flex gap-1 border-b border-border">
        {(["feed", "projects", "people"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "feed" && <InterestFeed interestId={u.id} />}
      {tab === "projects" && <InterestProjects interestId={u.id} />}
      {tab === "people" && <InterestPeople interestId={u.id} />}
    </div>
  );
}

function InterestFeed({ interestId }: { interestId: string }) {
  const { ref, inView } = useInView();
  const feed = trpc.feed.interest.useInfiniteQuery(
    { interestId, limit: 20 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );
  useEffect(() => {
    if (inView && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [inView, feed]);

  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];
  if (feed.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (posts.length === 0)
    return <EmptyPanel>No posts here yet. Start the conversation.</EmptyPanel>;

  return (
    <div className="space-y-4">
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
      <div ref={ref} aria-hidden />
    </div>
  );
}

function InterestProjects({ interestId }: { interestId: string }) {
  const projects = trpc.project.list.useQuery({ interestId, limit: 20 });
  if (projects.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!projects.data || projects.data.items.length === 0)
    return <EmptyPanel>No projects in this Interest yet.</EmptyPanel>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.data.items.map((p) => <ProjectCard key={p.id} project={p} />)}
    </div>
  );
}

function InterestPeople({ interestId }: { interestId: string }) {
  const members = trpc.interest.members.useQuery({ interestId, limit: 30 });
  if (members.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!members.data || members.data.items.length === 0)
    return <EmptyPanel>No members yet.</EmptyPanel>;
  return (
    <div className="space-y-2">
      {members.data.items.map((m) => (
        <Link key={m.id} href={`/u/${m.username}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-foreground/20">
          <Avatar src={m.profile?.avatarUrl} name={m.displayName} size={36} />
          <div className="min-w-0">
            <p className="truncate font-medium">{m.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{m.profile?.headline ?? `@${m.username}`}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function InterestSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
