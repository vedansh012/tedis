"use client";

import { useEffect } from "react";
import { Bookmark } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { PostCard } from "@/components/feed/post-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SavedPage() {
  const { ref, inView } = useInView();
  const list = trpc.feed.saved.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );
  useEffect(() => {
    if (inView && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  }, [inView, list]);

  const posts = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Saved</h1>
        <p className="text-sm text-muted-foreground">Posts you&rsquo;ve bookmarked for later.</p>
      </header>

      {list.isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Bookmark className="mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap the bookmark on any post to save it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}
      <div ref={ref} aria-hidden />
    </div>
  );
}
