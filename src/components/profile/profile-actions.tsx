"use client";

import { useState } from "react";
import { MoreHorizontal, Flag, Ban, UserCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import dynamic from "next/dynamic";

// Interaction-gated: only loads once the user opens the profile overflow menu.
const ReportDialog = dynamic(
  () => import("@/components/moderation/report-dialog").then((m) => m.ReportDialog),
  { ssr: false },
);

/** Overflow menu on someone else's profile: block/unblock + report. */
export function ProfileActions({ userId, username }: { userId: string; username: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  const blockedQ = trpc.moderation.isBlocked.useQuery({ userId });
  const isBlocked = blockedQ.data ?? false;

  const afterToggle = async () => {
    await Promise.all([
      utils.moderation.isBlocked.invalidate({ userId }),
      utils.feed.home.invalidate(),
    ]);
    setOpen(false);
  };
  const block = trpc.moderation.block.useMutation({ onSuccess: afterToggle });
  const unblock = trpc.moderation.unblock.useMutation({ onSuccess: afterToggle });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg duration-150 ease-out animate-in fade-in zoom-in-95 slide-in-from-top-1"
          >
            <button
              role="menuitem"
              disabled={block.isPending || unblock.isPending}
              onClick={() => (isBlocked ? unblock.mutate({ userId }) : block.mutate({ userId }))}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {isBlocked ? <UserCheck size={15} /> : <Ban size={15} />}
              {isBlocked ? `Unblock @${username}` : `Block @${username}`}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setReporting(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Flag size={15} /> Report @{username}
            </button>
          </div>
        </>
      )}

      {reporting && (
        <ReportDialog targetType="USER" targetId={userId} targetLabel={`@${username}`} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}
