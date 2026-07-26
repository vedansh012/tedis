"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, MessageCircle, Bookmark, Link2, FolderGit2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { PostMedia } from "./post-media";
import { PostMenu } from "./post-menu";
import { ShareButton } from "./share-button";
import { GitRepoCard } from "./git-repo-card";
import type { FeedItem } from "@/lib/trpc/types";

const TYPE_LABEL: Record<string, string> = {
  QUESTION: "Question",
  RESOURCE: "Resource",
  MILESTONE: "Milestone",
  DISCUSSION: "Discussion",
};

export function PostCard({ post, hideProjectCard }: { post: FeedItem; hideProjectCard?: boolean }) {
  // Local optimistic state keeps interactions instant without cache surgery.
  const [reacted, setReacted] = useState(post.reacted);
  const [reactions, setReactions] = useState(post.reactionsCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  // Bump counters re-trigger the "pop" only on real taps, never on first render
  // (so already-liked/saved posts don't pop as they scroll into view).
  const [reactBump, setReactBump] = useState(0);
  const [saveBump, setSaveBump] = useState(0);

  const react = trpc.feed.toggleReaction.useMutation({
    onError: () => {
      setReacted((r) => !r);
      setReactions((c) => (reacted ? c + 1 : c - 1));
    },
  });
  const bookmark = trpc.feed.toggleBookmark.useMutation({
    onError: () => setBookmarked((b) => !b),
  });

  function onReact() {
    const next = !reacted;
    setReacted(next);
    setReactions((c) => c + (next ? 1 : -1));
    setReactBump((b) => b + 1);
    react.mutate({ targetType: "POST", targetId: post.id });
  }
  function onBookmark() {
    setBookmarked((b) => !b);
    setSaveBump((b) => b + 1);
    bookmark.mutate({ targetType: "POST", targetId: post.id });
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors">
      <header className="flex items-start gap-3">
        <Link href={`/u/${post.author.username}`}>
          <Avatar src={post.author.profile?.avatarUrl} name={post.author.displayName} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <Link href={`/u/${post.author.username}`} className="font-medium hover:underline">
              {post.author.displayName}
            </Link>
            <span className="text-muted-foreground">@{post.author.username}</span>
            <Link href={`/posts/${post.id}`} className="text-muted-foreground hover:underline">
              · {timeAgo(post.createdAt)}
            </Link>
            {post.interest && (
              <Link
                href={`/interest/${post.interest.slug}`}
                className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: (post.interest.accentColor ?? "#FF6B00") + "1a", color: post.interest.accentColor ?? "#FF6B00" }}
              >
                {post.interest.name}
              </Link>
            )}
          </div>
          {TYPE_LABEL[post.type] && (
            <span className="mt-0.5 inline-block text-xs font-medium text-muted-foreground">
              {TYPE_LABEL[post.type]}
            </span>
          )}
        </div>
        <PostMenu postId={post.id} authorLabel={`@${post.author.username}`} />
      </header>

      {post.body && <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.body}</div>}

      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          <Link2 size={16} className="shrink-0" />
          <span className="truncate">{post.linkUrl}</span>
        </a>
      )}

      <GitRepoCard url={post.gitRepoUrl} />

      <PostMedia media={post.media} />

      {post.project && !hideProjectCard && <ProjectSeriesCard project={post.project} />}

      <footer className="mt-3 flex items-center gap-1 text-muted-foreground">
        <button
          onClick={onReact}
          aria-pressed={reacted}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary",
            reacted && "text-primary",
          )}
        >
          <span key={reactBump} className={cn("inline-flex", reacted && reactBump > 0 && "animate-pop")}>
            <Award size={18} className={cn("transition-colors", reacted && "fill-primary/20")} />
          </span>
          <span className="tabular-nums">{reactions}</span>
          <span className="sr-only">Respect</span>
        </button>
        <Link
          href={`/posts/${post.id}`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
        >
          <MessageCircle size={18} />
          <span className="tabular-nums">{post.commentsCount}</span>
          <span className="sr-only">Comments</span>
        </Link>
        <ShareButton postId={post.id} initialCount={post.sharesCount} />
        <button
          onClick={onBookmark}
          aria-pressed={bookmarked}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary",
            bookmarked && "text-primary",
          )}
        >
          <span key={saveBump} className={cn("inline-flex", bookmarked && saveBump > 0 && "animate-pop")}>
            <Bookmark size={18} className={cn("transition-colors", bookmarked && "fill-primary/20")} />
          </span>
          <span className="sr-only">Bookmark</span>
        </button>
      </footer>
    </article>
  );
}

/**
 * Small "which project" indicator shown on any feed post that belongs to a
 * project — a subtle chip giving the post its story context and a path into the
 * project's full timeline. The post itself is unchanged.
 */
function ProjectSeriesCard({ project }: { project: NonNullable<FeedItem["project"]> }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group mt-3 flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/50"
    >
      <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-primary">
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <FolderGit2 size={15} />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="text-muted-foreground">Part of </span>
        <span className="font-medium">{project.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
        View project <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
