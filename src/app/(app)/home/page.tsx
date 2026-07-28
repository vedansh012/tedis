"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { Composer } from "@/components/feed/composer";
import { InterestPills } from "@/components/feed/interest-pills";
import { PostCard } from "@/components/feed/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TedisMark } from "@/components/brand/tedis-mark";

export default function HomePage() {
  const [interest, setInterest] = useState<string | null>(null);
  const me = trpc.auth.me.useQuery();
  const { ref, inView } = useInView();

  const feed = trpc.feed.home.useInfiniteQuery(
    { interestId: interest, limit: 20 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  useEffect(() => {
    if (inView && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [inView, feed]);

  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <TedisMark size={92} float priority />
        <p className="text-sm text-muted-foreground">Build in the open</p>
      </div>

      {me.data && <Composer user={{ displayName: me.data.displayName, avatarUrl: null }} />}

      <div className="sticky top-0 z-10 -mx-4 bg-surface/80 px-4 pt-1 backdrop-blur md:mx-0 md:px-0">
        <InterestPills value={interest} onChange={setInterest} />
      </div>

      {feed.isLoading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <EmptyFeed scoped={interest !== null} />
      ) : (
        <div className="space-y-4 md:space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <div ref={ref} aria-hidden />
      {feed.isFetchingNextPage && <FeedSkeleton count={1} />}
      {!feed.hasNextPage && posts.length > 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">You&rsquo;re all caught up ✦</p>
      )}
    </div>
  );
}

function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ scoped }: { scoped: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
      <p className="text-lg font-medium">
        {scoped ? "It's calm in this topic right now." : "Your feed is just getting started."}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Share what you&rsquo;re working on, or explore new topics to follow more people.
      </p>
    </div>
  );
}
