"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { timeAgo } from "@/lib/time";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArchiveRestore } from "lucide-react";

/**
 * Deleted-posts review. Lists soft-deleted posts newest-tomb-first with a
 * one-click restore. Nothing shown here is visible in normal feeds — the
 * feed and profile queries filter deletedAt IS NULL — so this is the only
 * surface an admin has to recover a wrongful deletion.
 */
export default function AdminDeletedPosts() {
  const utils = trpc.useUtils();
  const posts = trpc.admin.deletedPosts.useQuery();
  const restore = trpc.admin.restorePost.useMutation({
    onSuccess: () => utils.admin.deletedPosts.invalidate(),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deleted posts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Soft-deleted posts, newest first. Restoring puts a post back into every feed exactly as it was.
        </p>
      </div>

      {posts.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !posts.data || posts.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No deleted posts. 🎉
        </div>
      ) : (
        <ul className="stagger space-y-2">
          {posts.data.map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  <Link href={`/u/${p.author.username}`} className="font-medium text-foreground hover:underline">
                    @{p.author.username}
                  </Link>{" "}
                  · posted {timeAgo(p.createdAt)}
                </span>
                <span title={p.deletedAt ? new Date(p.deletedAt).toISOString() : ""}>
                  Deleted {p.deletedAt ? timeAgo(p.deletedAt) : "?"}
                </span>
              </div>

              {/* Preview truncated so a long body doesn't blow up the row. Full
                  text is still available server-side to a determined admin. */}
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm">
                {p.body || <span className="italic text-muted-foreground">(no body — attachments only)</span>}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={restore.isPending}
                  onClick={() => restore.mutate({ postId: p.id })}
                >
                  <ArchiveRestore size={15} /> Restore
                </Button>
                <code className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {p.id}
                </code>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
