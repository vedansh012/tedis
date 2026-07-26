"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { ProjectCard } from "@/components/project/project-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const { ref, inView } = useInView();
  const list = trpc.project.list.useInfiniteQuery(
    { limit: 20 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );
  useEffect(() => {
    if (inView && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  }, [inView, list]);

  const projects = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Work being built in the open.</p>
        </div>
        <Link href="/new">
          <Button size="sm"><Plus size={16} /> New</Button>
        </Link>
      </header>

      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to showcase what you&rsquo;re building.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
      <div ref={ref} aria-hidden />
    </div>
  );
}
