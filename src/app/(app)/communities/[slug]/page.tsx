"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessagesSquare, Users, Lock, Pin } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useInView } from "@/hooks/use-in-view";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/auth/field";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommunityPage() {
  const slug = String(useParams().slug);
  const utils = trpc.useUtils();
  const community = trpc.community.bySlug.useQuery({ slug });

  const join = trpc.community.join.useMutation({ onSuccess: () => utils.community.bySlug.invalidate({ slug }) });
  const leave = trpc.community.leave.useMutation({ onSuccess: () => utils.community.bySlug.invalidate({ slug }) });

  if (community.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!community.data) return <p className="py-16 text-center text-muted-foreground">Community not found.</p>;
  const c = community.data;

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            {c.purpose && <p className="text-sm text-muted-foreground">{c.purpose}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {c.interest && (
                <Link href={`/interest/${c.interest.slug}`} className="rounded-full px-2 py-0.5 font-medium"
                  style={{ backgroundColor: (c.interest.accentColor ?? "#7c5cff") + "1a", color: c.interest.accentColor ?? "#7c5cff" }}>
                  {c.interest.name}
                </Link>
              )}
              <span className="flex items-center gap-1"><Users size={13} /> {c.membersCount.toLocaleString()}</span>
              <span className="flex items-center gap-1"><MessagesSquare size={13} /> {c.threadsCount}</span>
            </div>
          </div>
          {c.isMember ? (
            <Button variant="outline" size="sm" onClick={() => leave.mutate({ communityId: c.id })}>
              {c.role === "OWNER" ? "Owner" : "Joined"}
            </Button>
          ) : (
            <Button size="sm" onClick={() => join.mutate({ communityId: c.id })}>Join</Button>
          )}
        </div>

        {c.description && <p className="mt-3 border-t border-border pt-3 text-sm">{c.description}</p>}

        {c.rules.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Community rules</p>
            <ol className="list-inside list-decimal space-y-0.5 text-sm text-muted-foreground">
              {c.rules.map((r) => <li key={r.id}>{r.title}</li>)}
            </ol>
          </div>
        )}
      </header>

      {c.isMember && <NewThread communityId={c.id} onCreated={() => utils.community.threads.invalidate({ communityId: c.id })} />}

      <ThreadList communityId={c.id} slug={slug} />
    </div>
  );
}

function NewThread({ communityId, onCreated }: { communityId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const create = trpc.community.createThread.useMutation({
    onSuccess: () => {
      setTitle(""); setBody(""); setOpen(false);
      onCreated();
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-xl border border-dashed border-border bg-card/50 p-4 text-left text-sm text-muted-foreground hover:border-foreground/20">
        Start a discussion…
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <Field label="Title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to discuss?" />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add details…" aria-label="Discussion body" />
      {create.isError && <p role="alert" className="text-sm text-destructive">{create.error.message}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" loading={create.isPending} disabled={title.trim().length < 3 || body.trim().length < 1}
          onClick={() => create.mutate({ communityId, title: title.trim(), body: body.trim() })}>
          Post discussion
        </Button>
      </div>
    </div>
  );
}

function ThreadList({ communityId, slug }: { communityId: string; slug: string }) {
  const { ref, inView } = useInView();
  const threads = trpc.community.threads.useInfiniteQuery(
    { communityId, limit: 20 },
    { getNextPageParam: (l) => l.nextCursor ?? undefined },
  );
  useEffect(() => {
    if (inView && threads.hasNextPage && !threads.isFetchingNextPage) threads.fetchNextPage();
  }, [inView, threads]);

  const items = threads.data?.pages.flatMap((p) => p.items) ?? [];
  if (threads.isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (items.length === 0)
    return <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">No discussions yet. Be the first.</div>;

  return (
    <div className="space-y-2">
      {items.map((t) => (
        <Link key={t.id} href={`/communities/${slug}/${t.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-foreground/20">
          <div className="flex items-center gap-2">
            {t.isPinned && <Pin size={14} className="text-primary" />}
            {t.isLocked && <Lock size={14} className="text-muted-foreground" />}
            <h3 className="font-medium">{t.title}</h3>
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{t.body}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar src={t.author.profile?.avatarUrl} name={t.author.displayName} size={18} />
            <span>{t.author.displayName}</span>
            <span>· {timeAgo(t.createdAt)}</span>
            <span className="ml-auto flex items-center gap-1"><MessagesSquare size={12} /> {t.repliesCount}</span>
          </div>
        </Link>
      ))}
      <div ref={ref} aria-hidden />
    </div>
  );
}
