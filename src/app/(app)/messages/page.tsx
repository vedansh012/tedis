"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { trpc } from "@/lib/trpc/client";
import { useChatStream } from "@/hooks/use-chat-stream";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type Peer = { id: string; username: string; displayName: string; profile: { avatarUrl: string | null } | null };

export default function MessagesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] rounded-xl" />}>
      <Messenger />
    </Suspense>
  );
}

function Messenger() {
  const initialConvo = useSearchParams().get("c");
  const me = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const conversations = trpc.message.conversations.useQuery();

  const [selected, setSelected] = useState<string | null>(initialConvo);
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [typingIn, setTypingIn] = useState<Record<string, number>>({}); // conversationId -> expiry ts
  const myId = me.data?.id;

  const markRead = trpc.message.markRead.useMutation({
    onSuccess: () => utils.message.conversations.invalidate(),
  });

  // ---- realtime: one SSE stream drives everything ----
  const handleEvent = useCallback(
    (ev: Parameters<Parameters<typeof useChatStream>[0]>[0]) => {
      if (ev.t === "message") {
        // Append incoming messages from others to the open thread (my own
        // messages are handled optimistically by the send mutation).
        if (ev.message.senderId !== myId && ev.conversationId === selected) {
          utils.message.history.setData({ conversationId: ev.conversationId }, (old) => {
            if (!old) return old;
            if (old.items.some((m) => m.id === ev.message.id)) return old;
            const incoming = {
              id: ev.message.id,
              conversationId: ev.message.conversationId,
              body: ev.message.body,
              senderId: ev.message.senderId,
              createdAt: new Date(ev.message.createdAt),
            };
            return { ...old, items: [...old.items, incoming] };
          });
          markRead.mutate({ conversationId: ev.conversationId });
        }
        void utils.message.conversations.invalidate();
      } else if (ev.t === "typing") {
        setTypingIn((prev) => ({ ...prev, [ev.conversationId]: Date.now() + 3500 }));
      } else if (ev.t === "read") {
        if (ev.conversationId === selected) {
          utils.message.conversation.setData({ conversationId: ev.conversationId }, (old) =>
            old ? { ...old, peerLastReadAt: new Date(ev.at) } : old,
          );
        }
      } else if (ev.t === "presence") {
        setOnline((prev) => ({ ...prev, [ev.userId]: ev.online }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myId, selected],
  );
  useChatStream(handleEvent);

  // Mark read whenever a conversation is opened.
  useEffect(() => {
    if (selected) markRead.mutate({ conversationId: selected });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const list = conversations.data ?? [];

  return (
    /*
      Height must discount the app chrome *and* the device insets, or the chat
      composer ends up under the bottom nav / home indicator on notched phones.
      Mobile chrome ≈ top bar + page padding + bottom nav; desktop has neither
      bar, so it only subtracts its own page padding.
    */
    <div className="flex h-[calc(100dvh-9.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-hidden rounded-xl border border-border bg-card md:h-[calc(100dvh-6rem)]">
      {/* Conversation list */}
      <aside className={cn("w-full shrink-0 overflow-y-auto border-r border-border md:w-80", selected && "hidden md:block")}>
        <header className="sticky top-0 z-10 border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
          <h1 className="text-lg font-semibold tracking-tight">Messages</h1>
        </header>
        {conversations.isLoading ? (
          <div className="space-y-1 p-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No conversations yet. Open someone&rsquo;s profile and hit <span className="font-medium">Message</span>.
          </div>
        ) : (
          <ul className="stagger p-2">
            {list.map((c) => {
              const isOnline = c.peer ? (online[c.peer.id] ?? c.peerOnline) : false;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-secondary/60",
                      selected === c.id && "bg-secondary",
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar src={c.peer?.profile?.avatarUrl} name={c.peer?.displayName ?? "?"} size={44} />
                      {isOnline && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-success" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.peer?.displayName ?? "Unknown"}</span>
                        {c.lastMessageAt && <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className={cn("truncate text-xs", c.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {c.lastMessage?.senderId === myId ? "You: " : ""}
                          {c.lastMessage?.body ?? "…"}
                        </span>
                        {c.unread > 0 && (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                            {c.unread > 9 ? "9+" : c.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Active chat */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !selected && "hidden md:flex")}>
        {selected && myId ? (
          <ChatWindow
            key={selected}
            conversationId={selected}
            myId={myId}
            online={online}
            typing={(typingIn[selected] ?? 0) > Date.now()}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessagesSquare size={40} className="opacity-40" />
            <p className="text-sm">Select a conversation to start chatting.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function ChatWindow({
  conversationId,
  myId,
  online,
  typing,
  onBack,
}: {
  conversationId: string;
  myId: string;
  online: Record<string, boolean>;
  typing: boolean;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const header = trpc.message.conversation.useQuery({ conversationId });
  const history = trpc.message.history.useQuery({ conversationId });
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTyping = useRef(0);

  const peer = header.data?.peer as Peer | null | undefined;
  const peerOnline = peer ? (online[peer.id] ?? header.data?.peerOnline ?? false) : false;
  const items = history.data?.items ?? [];

  // Keep scrolled to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items.length, typing]);

  const send = trpc.message.send.useMutation({
    onMutate: async ({ conversationId, body }) => {
      await utils.message.history.cancel({ conversationId });
      const temp = { id: `tmp-${Date.now()}`, conversationId, body, senderId: myId, createdAt: new Date() };
      utils.message.history.setData({ conversationId }, (old) =>
        old ? { ...old, items: [...old.items, temp] } : { items: [temp], nextCursor: null },
      );
      return { tempId: temp.id };
    },
    onSuccess: (real, vars, ctx) => {
      utils.message.history.setData({ conversationId: vars.conversationId }, (old) =>
        old ? { ...old, items: old.items.map((m) => (m.id === ctx?.tempId ? real : m)) } : old,
      );
      void utils.message.conversations.invalidate();
    },
    onError: (_e, vars, ctx) => {
      utils.message.history.setData({ conversationId: vars.conversationId }, (old) =>
        old ? { ...old, items: old.items.filter((m) => m.id !== ctx?.tempId) } : old,
      );
    },
  });
  const typingMut = trpc.message.typing.useMutation();

  function onDraftChange(v: string) {
    setDraft(v);
    const now = Date.now();
    if (v.trim() && now - lastTyping.current > 1500) {
      lastTyping.current = now;
      typingMut.mutate({ conversationId });
    }
  }
  function submit() {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft("");
    send.mutate({ conversationId, body });
  }

  // "Seen" indicator: peer has read up to my latest message.
  const myLast = [...items].reverse().find((m) => m.senderId === myId);
  const seen =
    myLast && header.data?.peerLastReadAt && new Date(header.data.peerLastReadAt) >= new Date(myLast.createdAt);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} aria-label="Back" className="rounded-md p-1 text-muted-foreground hover:bg-secondary md:hidden">
          <ArrowLeft size={18} />
        </button>
        {peer ? (
          <Link href={`/u/${peer.username}`} className="flex items-center gap-3 hover:opacity-90">
            <span className="relative">
              <Avatar src={peer.profile?.avatarUrl} name={peer.displayName} size={36} />
              {peerOnline && <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-success" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">{peer.displayName}</span>
              <span className="block text-xs text-muted-foreground">{peerOnline ? "Active now" : `@${peer.username}`}</span>
            </span>
          </Link>
        ) : (
          <Skeleton className="h-9 w-40" />
        )}
      </header>

      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {history.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className={cn("h-9 rounded-2xl", i % 2 ? "ml-auto w-40" : "w-52")} />)}</div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Say hello 👋</p>
        ) : (
          items.map((m, i) => {
            const mine = m.senderId === myId;
            const pending = m.id.startsWith("tmp-");
            const showTime = i === items.length - 1 || items[i + 1]?.senderId !== m.senderId;
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug duration-200 animate-in fade-in slide-in-from-bottom-1",
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                    pending && "opacity-60",
                  )}
                >
                  {m.body}
                </div>
                {showTime && (
                  <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {mine && seen && myLast?.id === m.id ? " · Seen" : ""}
                  </span>
                )}
              </div>
            );
          })
        )}
        {typing && (
          <div className="flex items-center gap-1 pl-1 pt-1 text-muted-foreground">
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Write a message…"
            rows={1}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2 text-[15px] transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-90 disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
}
