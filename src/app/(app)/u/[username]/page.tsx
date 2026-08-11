"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, LinkIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/profile/follow-button";
import { ProfileActions } from "@/components/profile/profile-actions";
import { MessageButton } from "@/components/profile/message-button";
import { PostCard } from "@/components/feed/post-card";
import { ProjectCard } from "@/components/project/project-card";

type Tab = "work" | "activity" | "following";

// "work" = the developer's projects (build-in-public), "activity" = their posts.
const TAB_LABELS: Record<Tab, string> = { work: "Projects", activity: "Posts", following: "Following" };

export default function ProfilePage() {
  const username = String(useParams().username);
  const [tab, setTab] = useState<Tab>("work");
  const profile = trpc.profile.byUsername.useQuery({ username });

  if (profile.isLoading) return <ProfileSkeleton />;
  if (!profile.data) return <p className="py-16 text-center text-muted-foreground">User not found.</p>;

  const p = profile.data;

  return (
    <div className="space-y-6">
      <header>
        {/*
          Wraps to a second row on very narrow screens (<=360px) instead of
          pushing the actions off-screen. `min-w-0` lets the name column shrink
          — without it the flex item refuses to go below its content width and
          overflows the viewport.
        */}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <Avatar src={p.profile?.avatarUrl} name={p.displayName} size={80} />
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{p.displayName}</h1>
            <p className="truncate text-sm text-muted-foreground">@{p.username}</p>
          </div>
          {p.isSelf ? (
            <Link href="/settings" className="shrink-0">
              <Button variant="outline" size="sm">Edit profile</Button>
            </Link>
          ) : (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <FollowButton userId={p.id} initialFollowing={p.isFollowing} size="sm" />
              <MessageButton userId={p.id} />
              <ProfileActions userId={p.id} username={p.username} />
            </div>
          )}
        </div>

        {p.profile?.headline && <p className="mt-3 text-[15px]">{p.profile.headline}</p>}
        {p.profile?.bio && <p className="mt-1 text-sm text-muted-foreground">{p.profile.bio}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {p.profile?.location && (
            <span className="flex items-center gap-1"><MapPin size={14} /> {p.profile.location}</span>
          )}
          {p.profile?.websiteUrl && (
            <a href={p.profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
              <LinkIcon size={14} /> Website
            </a>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span><strong>{p.profile?.projectsCount ?? 0}</strong> <span className="text-muted-foreground">projects</span></span>
          <span><strong>{p.profile?.followingCount ?? 0}</strong> <span className="text-muted-foreground">following</span></span>
          {p.helpedCount > 0 && (
            <span><strong>{p.helpedCount}</strong> <span className="text-muted-foreground">{p.helpedCount === 1 ? "builder helped" : "builders helped"}</span></span>
          )}
        </div>

        {/* Followers, framed as contribution — "follow their work in X", never bare clout. */}
        <p className="mt-1.5 text-sm text-muted-foreground">
          <strong className="text-foreground">{p.profile?.followersCount ?? 0}</strong>{" "}
          {(p.profile?.followersCount ?? 0) === 1 ? "builder follows" : "builders follow"}
          {p.topInterests.length > 0 ? (
            <>
              {" "}their work in{" "}
              {p.topInterests.map((i, idx) => (
                <span key={i.slug}>
                  {idx > 0 && <span> &amp; </span>}
                  <Link href={`/interest/${i.slug}`} className="font-medium text-foreground hover:underline">
                    {i.name}
                  </Link>
                </span>
              ))}
            </>
          ) : (
            <> their work</>
          )}
        </p>

        {p.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.interests.map((u) => (
              <Link
                key={u.slug}
                href={`/interest/${u.slug}`}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: (u.accentColor ?? "#7c5cff") + "1a", color: u.accentColor ?? "#7c5cff" }}
              >
                {u.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="flex gap-1 border-b border-border">
        {(["work", "activity", "following"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div key={tab} className="duration-200 ease-out animate-in fade-in">
        {tab === "work" ? (
          <WorkTab userId={p.id} />
        ) : tab === "activity" ? (
          <ActivityTab userId={p.id} />
        ) : (
          <FollowingTab userId={p.id} />
        )}
      </div>
    </div>
  );
}

function FollowingTab({ userId }: { userId: string }) {
  const following = trpc.profile.following.useQuery({ userId });
  if (following.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!following.data || following.data.length === 0)
    return <Empty>Not following anyone yet.</Empty>;
  return (
    <ul className="space-y-2">
      {following.data.map((u) => (
        <li key={u.id}>
          <Link
            href={`/u/${u.username}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-secondary/40"
          >
            <Avatar src={u.profile?.avatarUrl} name={u.displayName} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.profile?.headline ?? `@${u.username}`}
              </p>
            </div>
            <div className="hidden shrink-0 gap-1.5 sm:flex">
              {u.interests.map((i) => (
                <span
                  key={i.interest.name}
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: (i.interest.accentColor ?? "#e2531a") + "1a", color: i.interest.accentColor ?? "#e2531a" }}
                >
                  {i.interest.name}
                </span>
              ))}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function WorkTab({ userId }: { userId: string }) {
  const projects = trpc.project.byUser.useQuery({ userId });
  if (projects.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!projects.data || projects.data.length === 0)
    return <Empty>No projects yet.</Empty>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.data.map((p) => <ProjectCard key={p.id} project={p} />)}
    </div>
  );
}

function ActivityTab({ userId }: { userId: string }) {
  const { ref, inView } = useInView();
  const feed = trpc.feed.byUser.useInfiniteQuery(
    { userId, limit: 20 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );
  useEffect(() => {
    if (inView && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [inView, feed]);
  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];
  if (feed.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (posts.length === 0) return <Empty>No activity yet.</Empty>;
  return (
    <div className="space-y-4">
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
      <div ref={ref} aria-hidden />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
