"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { CommunityCard } from "@/components/community/community-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommunitiesPage() {
  const { ref, inView } = useInView();
  const list = trpc.community.list.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );
  useEffect(() => {
    if (inView && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  }, [inView, list]);

  const communities = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Communities</h1>
          <p className="text-sm text-muted-foreground">Focused spaces inside your interests.</p>
        </div>
        <Link href="/communities/new">
          <Button size="sm"><Plus size={16} /> New</Button>
        </Link>
      </header>

      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : communities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-medium">No communities yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start one and gather people around a focused topic.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {communities.map((c) => <CommunityCard key={c.id} community={c} />)}
        </div>
      )}
      <div ref={ref} aria-hidden />
    </div>
  );
}
