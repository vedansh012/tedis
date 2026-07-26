"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function ThreadPage() {
  const params = useParams();
  const slug = String(params.slug);
  const threadId = String(params.threadId);
  const utils = trpc.useUtils();

  const community = trpc.community.bySlug.useQuery({ slug });
  const thread = trpc.community.thread.useQuery({ threadId });
  const [body, setBody] = useState("");

  const reply = trpc.community.createReply.useMutation({
    onSuccess: async () => {
      setBody("");
      await utils.community.thread.invalidate({ threadId });
    },
  });

  if (thread.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!thread.data) return <p className="py-16 text-center text-muted-foreground">Thread not found.</p>;
  const t = thread.data;
  const isMember = community.data?.isMember ?? false;

  return (
    <div className="space-y-5">
      <Link href={`/communities/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> {t.community.name}
      </Link>

      <article className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          {t.isLocked && <Lock size={15} className="text-muted-foreground" />}
          <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar src={t.author.profile?.avatarUrl} name={t.author.displayName} size={24} />
          <Link href={`/u/${t.author.username}`} className="font-medium text-foreground hover:underline">{t.author.displayName}</Link>
          <span>· {timeAgo(t.createdAt)}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{t.body}</p>
      </article>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.repliesCount} {t.repliesCount === 1 ? "reply" : "replies"}
        </h2>
        {t.replies.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm">
              <Avatar src={r.author.profile?.avatarUrl} name={r.author.displayName} size={22} />
              <Link href={`/u/${r.author.username}`} className="font-medium hover:underline">{r.author.displayName}</Link>
              <span className="text-muted-foreground">· {timeAgo(r.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{r.body}</p>
          </div>
        ))}
        {t.replies.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
      </section>

      {t.isLocked ? (
        <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">This thread is locked.</p>
      ) : isMember ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" aria-label="Reply" />
          {reply.isError && <p role="alert" className="text-sm text-destructive">{reply.error.message}</p>}
          <div className="flex justify-end">
            <Button size="sm" loading={reply.isPending} disabled={body.trim().length < 1}
              onClick={() => reply.mutate({ threadId, body: body.trim() })}>
              Reply
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
          Join this community to reply.
        </p>
      )}
    </div>
  );
}
