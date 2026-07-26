"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Award, Github, ExternalLink, Users, Share2, Check, FolderGit2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/feed/post-card";
import { Composer } from "@/components/feed/composer";

const STATUS_STYLES: Record<string, string> = {
  IDEA: "bg-secondary text-secondary-foreground",
  BUILDING: "bg-warning/15 text-warning",
  LIVE: "bg-success/15 text-success",
  PAUSED: "bg-secondary text-muted-foreground",
  ARCHIVED: "bg-secondary text-muted-foreground",
};

export default function ProjectDetailPage() {
  const slug = String(useParams().slug);
  const project = trpc.project.bySlug.useQuery({ slug });
  const me = trpc.auth.me.useQuery();

  const [reacted, setReacted] = useState(false);
  const react = trpc.feed.toggleReaction.useMutation({ onError: () => setReacted((r) => !r) });

  if (project.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!project.data) return <p className="py-16 text-center text-muted-foreground">Project not found.</p>;

  const p = project.data;
  const isOwner = me.data?.id === p.owner.id;

  function onReact() {
    setReacted((r) => !r);
    react.mutate({ targetType: "PROJECT", targetId: p.id });
  }
  const displayCount = p.reactionsCount + (reacted ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* --- Cover --- */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-secondary/40 text-muted-foreground sm:h-52">
        {p.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <FolderGit2 size={44} className="opacity-40" />
        )}
        <Badge className={cn("absolute right-3 top-3", STATUS_STYLES[p.status])}>{p.status.toLowerCase()}</Badge>
      </div>

      {/* --- Header --- */}
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
        {p.tagline && <p className="text-muted-foreground">{p.tagline}</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <Link href={`/u/${p.owner.username}`} className="flex items-center gap-2 hover:underline">
            <Avatar src={p.owner.profile?.avatarUrl} name={p.owner.displayName} size={28} />
            {p.owner.displayName}
          </Link>
          {p.interest && (
            <Link href={`/interest/${p.interest.slug}`} className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: (p.interest.accentColor ?? "#7c5cff") + "1a", color: p.interest.accentColor ?? "#7c5cff" }}>
              {p.interest.name}
            </Link>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <CalendarDays size={14} /> Started {timeAgo(p.createdAt)}
          </span>
          <span className="text-muted-foreground">· {p._count.posts} {p._count.posts === 1 ? "post" : "posts"}</span>
          {p.openToCollab && <Badge variant="outline" className="text-primary">Open to collab</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={reacted ? "default" : "outline"} size="sm" onClick={onReact}>
            <Award size={16} /> Respect · {displayCount}
          </Button>
          <ShareProjectButton slug={slug} />
          {p.repoUrl && (
            <a href={p.repoUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Github size={16} /> Repo</Button>
            </a>
          )}
          {p.links.filter((l) => l.kind === "LIVE" || l.kind === "DEMO").map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink size={16} /> {l.label ?? l.kind.toLowerCase()}</Button>
            </a>
          ))}
        </div>
      </header>

      {p.description && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{p.description}</p>
        </section>
      )}

      {p.technologies.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tech stack</h2>
          <div className="flex flex-wrap gap-1.5">
            {p.technologies.map((t) => <Badge key={t.tech.slug}>{t.tech.name}</Badge>)}
          </div>
        </section>
      )}

      {p.contributors.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users size={14} /> Collaborators
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.contributors.map((c) => (
              <Link key={c.user.username} href={`/u/${c.user.username}`}
                className={cn("flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm hover:border-foreground/20")}>
                <Avatar src={c.user.profile?.avatarUrl} name={c.user.displayName} size={24} />
                {c.user.displayName}
                <span className="text-xs text-muted-foreground">{c.role.toLowerCase()}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* --- The journey: every project post in order --- */}
      <Timeline
        projectId={p.id}
        projectName={p.name}
        isOwner={isOwner}
        viewerName={me.data?.displayName ?? ""}
      />
    </div>
  );
}

const TIMELINE_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function Timeline({
  projectId,
  projectName,
  isOwner,
  viewerName,
}: {
  projectId: string;
  projectName: string;
  isOwner: boolean;
  viewerName: string;
}) {
  const timeline = trpc.project.timeline.useQuery({ projectId });
  const posts = timeline.data ?? [];

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        The journey
      </h2>

      {/* Owner: document the project without leaving the page. Reuses the feed
          composer; posts auto-attach to this project and land in the timeline. */}
      {isOwner && (
        <div className="mb-6">
          <Composer
            user={{ displayName: viewerName, avatarUrl: null }}
            lockedProjectId={projectId}
            lockedProjectName={projectName}
          />
        </div>
      )}

      {timeline.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-medium">The story starts here.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isOwner
              ? "Share your first update above to begin this project's timeline."
              : "No posts in this project yet — check back soon."}
          </p>
        </div>
      ) : (
        <ol className="relative space-y-6 before:absolute before:bottom-4 before:left-[9px] before:top-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-border">
          {posts.map((post, i) => {
            const isFirst = i === 0;
            const isLast = i === posts.length - 1;
            return (
              <li
                key={post.id}
                className="relative pl-9 duration-500 animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${Math.min(i, 6) * 60}ms`, animationFillMode: "backwards" }}
              >
                {/* Timeline node: filled at the start and the latest, hollow between. */}
                <span
                  className={cn(
                    "absolute left-0 top-1 flex size-5 items-center justify-center rounded-full border-2 bg-surface ring-4 ring-surface",
                    isFirst || isLast ? "border-primary" : "border-border",
                  )}
                  aria-hidden
                >
                  <span className={cn("size-2 rounded-full", isFirst || isLast ? "bg-primary" : "bg-muted-foreground/40")} />
                </span>

                {/* Date + position marker so the chronology is unmistakable. */}
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <time dateTime={new Date(post.createdAt).toISOString()} className="font-medium text-foreground">
                    {TIMELINE_DATE.format(new Date(post.createdAt))}
                  </time>
                  {isFirst && <span className="text-muted-foreground">· Where it started</span>}
                  {isLast && !isFirst && <span className="font-medium text-primary">· Latest update</span>}
                </div>

                <PostCard post={post} hideProjectCard />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ShareProjectButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  function share() {
    const url = `${window.location.origin}/projects/${slug}`;
    if (navigator.share) {
      void navigator.share({ url }).catch(() => {});
      return;
    }
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={share}>
      {copied ? <Check size={16} /> : <Share2 size={16} />} {copied ? "Copied" : "Share"}
    </Button>
  );
}
