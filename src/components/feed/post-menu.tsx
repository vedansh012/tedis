"use client";

import { useState } from "react";
import { MoreHorizontal, Flag, Link2, Check } from "lucide-react";
import dynamic from "next/dynamic";

// Only mounted after the user opens the kebab menu and chooses "Report".
const ReportDialog = dynamic(
  () => import("@/components/moderation/report-dialog").then((m) => m.ReportDialog),
  { ssr: false },
);

/** Kebab menu on a post: copy link + report. Fades/slides in; closes on outside click. */
export function PostMenu({ postId, authorLabel }: { postId: string; authorLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    void navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 900);
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-touch min-w-touch items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-90"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg duration-150 ease-out animate-in fade-in zoom-in-95 slide-in-from-top-1"
          >
            <button
              role="menuitem"
              onClick={copyLink}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
            >
              {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? "Copied" : "Copy link"}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setReporting(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Flag size={15} /> Report post
            </button>
          </div>
        </>
      )}

      {reporting && (
        <ReportDialog targetType="POST" targetId={postId} targetLabel={authorLabel} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}
