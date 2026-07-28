"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Link2, Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

/** Share control: copy link + native Web Share, with an optimistic share count. */
export function ShareButton({ postId, initialCount }: { postId: string; initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const share = trpc.feed.share.useMutation();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const url = typeof window !== "undefined" ? `${window.location.origin}/posts/${postId}` : "";
  const canWebShare = typeof navigator !== "undefined" && !!navigator.share;

  function record(target: "COPY_LINK" | "WEB_SHARE") {
    setCount((c) => c + 1);
    share.mutate(
      { postId, target },
      { onError: () => setCount((c) => c - 1) },
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      record("COPY_LINK");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
    setOpen(false);
  }

  async function webShare() {
    try {
      await navigator.share({ title: "TedIS", url });
      record("WEB_SHARE");
    } catch {
      /* user cancelled */
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-touch min-w-touch items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Share2 size={18} />
        {count > 0 && <span className="tabular-nums">{count}</span>}
        <span className="sr-only">Share</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-1 w-48 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg animate-fade-in"
        >
          <button role="menuitem" onClick={copyLink} className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary")}>
            {copied ? <Check size={16} className="text-success" /> : <Link2 size={16} />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          {canWebShare && (
            <button role="menuitem" onClick={webShare} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary">
              <Send size={16} /> Share via…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
