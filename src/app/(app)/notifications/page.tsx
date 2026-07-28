"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { timeAgo } from "@/lib/time";
import { PartyPopper } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const VERB: Record<string, string> = {
  FOLLOW: "started following you",
  REACTION: "respected your post",
  COMMENT: "commented on your post",
  REPLY: "replied to you",
  MENTION: "mentioned you",
  PROJECT_UPDATE: "updated a project you follow",
  COLLAB_REQUEST: "wants to collaborate",
  COMMUNITY_JOIN: "joined your community",
  COMMUNITY_POST: "posted in a community",
  MESSAGE: "sent you a message",
  SYSTEM: "",
};

function dataField(data: unknown, key: string): string {
  return data && typeof data === "object" && key in data
    ? String((data as Record<string, unknown>)[key] ?? "")
    : "";
}

/** Contextual phrasing: a follow tied to the Interest you're known for reads warmer. */
function verbFor(n: { type: string; data?: unknown }): string {
  if (n.type === "FOLLOW") {
    const interestName = dataField(n.data, "interestName");
    return interestName ? `started following your work in ${interestName}` : "started following you";
  }
  // System messages (e.g. an approved interest suggestion) carry their own copy.
  if (n.type === "SYSTEM") return dataField(n.data, "message");
  return VERB[n.type] ?? "";
}

/** For actor-less system notifications, deep-link to the relevant place. */
function hrefFor(n: { type: string; data?: unknown }): string | null {
  const slug = dataField(n.data, "interestSlug");
  return n.type === "SYSTEM" && slug ? `/interest/${slug}` : null;
}

export default function NotificationsPage() {
  const utils = trpc.useUtils();
  const { ref, inView } = useInView();
  const list = trpc.notification.list.useInfiniteQuery(
    { limit: 30 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );
  const markRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => utils.notification.unreadCount.invalidate(),
  });

  // Mark everything read when the page is opened.
  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inView && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  }, [inView, list]);

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={() => markRead.mutate()}>Mark all read</Button>
      </header>

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-medium">You&rsquo;re all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">Notifications from your interests will appear here.</p>
        </div>
      ) : (
        <ul className="stagger space-y-1.5">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${n.readAt ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
            >
              {n.actor ? (
                <Link
                  href={`/u/${n.actor.username}`}
                  aria-label={`${n.actor.displayName}'s profile`}
                  className="shrink-0"
                >
                  <Avatar src={n.actor.profile?.avatarUrl} name={n.actor.displayName} size={36} />
                </Link>
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <PartyPopper size={16} />
                </span>
              )}
              <p className="flex-1 text-sm">
                {n.actor && (
                  <Link href={`/u/${n.actor.username}`} className="font-medium hover:underline">
                    {n.actor.displayName}{" "}
                  </Link>
                )}
                {hrefFor(n) ? (
                  <Link href={hrefFor(n)!} className="text-foreground hover:underline">{verbFor(n)}</Link>
                ) : (
                  <span className="text-muted-foreground">{verbFor(n)}</span>
                )}
              </p>
              <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
            </li>
          ))}
          <div ref={ref} aria-hidden />
        </ul>
      )}
    </div>
  );
}
