"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export function CommentSection({ postId, count }: { postId: string; count: number }) {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery();
  const [body, setBody] = useState("");
  const { ref, inView } = useInView();

  const list = trpc.comment.list.useInfiniteQuery(
    { postId, limit: 20 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );

  useEffect(() => {
    if (inView && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
  }, [inView, list]);

  const refresh = async () => {
    await Promise.all([utils.comment.list.invalidate({ postId }), utils.feed.post.invalidate({ id: postId })]);
  };

  const add = trpc.comment.add.useMutation({ onSuccess: async () => { setBody(""); await refresh(); } });
  const del = trpc.comment.delete.useMutation({ onSuccess: refresh });

  const comments = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {count} {count === 1 ? "comment" : "comments"}
      </h2>

      {me.data && (
        <div className="flex gap-3">
          <Avatar src={null} name={me.data.displayName} size={36} />
          <div className="flex-1 space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              placeholder="Add a comment…"
              aria-label="Add a comment"
              className="min-h-16"
            />
            {add.isError && <p role="alert" className="text-sm text-destructive">{add.error.message}</p>}
            <div className="flex justify-end">
              <Button size="sm" disabled={body.trim().length === 0} loading={add.isPending}
                onClick={() => add.mutate({ postId, body: body.trim() })}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {list.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No comments yet. Be the first.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Link href={`/u/${c.author.username}`}>
                <Avatar src={c.author.profile?.avatarUrl} name={c.author.displayName} size={36} />
              </Link>
              <div className="min-w-0 flex-1 rounded-lg bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Link href={`/u/${c.author.username}`} className="font-medium hover:underline">{c.author.displayName}</Link>
                  <span className="text-xs text-muted-foreground">@{c.author.username} · {timeAgo(c.createdAt)}</span>
                  {c.canDelete && (
                    <button
                      onClick={() => del.mutate({ commentId: c.id })}
                      aria-label="Delete comment"
                      className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{c.body}</p>
              </div>
            </li>
          ))}
          <div ref={ref} aria-hidden />
        </ul>
      )}
    </section>
  );
}
