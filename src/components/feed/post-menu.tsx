"use client";

import { useState } from "react";
import { MoreHorizontal, Flag, Link2, Check, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Only mounted after the user opens the kebab menu and chooses "Report".
const ReportDialog = dynamic(
  () => import("@/components/moderation/report-dialog").then((m) => m.ReportDialog),
  { ssr: false },
);

interface PostMenuProps {
  postId: string;
  authorId: string;
  authorLabel?: string;
  body: string;
  archived: boolean;
  onDeleted?: () => void;
  onArchivedChange?: (archived: boolean) => void;
  onBodyChange?: (body: string) => void;
}

/**
 * Kebab menu on a post. Everyone sees copy-link + report; the author additionally
 * sees Edit / Archive-or-Unarchive / Delete. Owner state is decided against
 * `auth.me` on the client so the menu items are hidden for anonymous viewers
 * and non-authors — but the *server* enforces ownership on every mutation, so
 * a hostile client can't reach these actions by unhiding the menu.
 */
export function PostMenu({
  postId,
  authorId,
  authorLabel,
  body,
  archived,
  onDeleted,
  onArchivedChange,
  onBodyChange,
}: PostMenuProps) {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isOwner = !!me.data && me.data.id === authorId;

  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Close both popovers *first* on delete success, then invalidate — never
  // touch a parent that might have unmounted us in the same tick. The refetch
  // that follows removes the deleted post from every list naturally, so
  // there's no need for a fragile `deleted` flag on the card itself.
  const del = trpc.feed.deletePost.useMutation({
    onSuccess: () => {
      setConfirmingDelete(false);
      setOpen(false);
      // Invalidate on the next tick so this component finishes its own state
      // updates and the ConfirmDialog exits cleanly before its parent
      // (PostCard) is unmounted by the cache refresh.
      setTimeout(() => {
        void utils.feed.invalidate();
        void utils.project.timeline.invalidate();
        onDeleted?.();
      }, 0);
    },
  });
  const archive = trpc.feed.setArchived.useMutation({
    onSuccess: (res) => {
      setOpen(false);
      // Flip the badge locally for instant feedback; invalidate to converge
      // every other surface (public feeds, project timelines) with the server.
      onArchivedChange?.(res.archived);
      void utils.feed.invalidate();
      void utils.project.timeline.invalidate();
    },
  });

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
            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg duration-150 ease-out animate-in fade-in zoom-in-95 slide-in-from-top-1"
          >
            <button
              role="menuitem"
              onClick={copyLink}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
            >
              {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? "Copied" : "Copy link"}
            </button>

            {isOwner && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  role="menuitem"
                  disabled={archive.isPending}
                  onClick={() => archive.mutate({ id: postId, archived: !archived })}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  {archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}{" "}
                  {archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setConfirmingDelete(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}

            {!isOwner && (
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
            )}
          </div>
        </>
      )}

      {reporting && (
        <ReportDialog targetType="POST" targetId={postId} targetLabel={authorLabel} onClose={() => setReporting(false)} />
      )}

      {editing && (
        <EditPostDialog
          postId={postId}
          initialBody={body}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            onBodyChange?.(next);
          }}
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this post?"
          body="This can't be undone. Your post will be removed from every feed. Comments will remain but shown as replies to a deleted post."
          confirmLabel={del.isPending ? "Deleting…" : "Delete post"}
          destructive
          disabled={del.isPending}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => del.mutate({ id: postId })}
          errorMessage={del.error?.message ?? null}
        />
      )}
    </div>
  );
}

// ---- edit dialog ----------------------------------------------------------

function EditPostDialog({
  postId,
  initialBody,
  onClose,
  onSaved,
}: {
  postId: string;
  initialBody: string;
  onClose: () => void;
  onSaved: (body: string) => void;
}) {
  const [body, setBody] = useState(initialBody);
  const utils = trpc.useUtils();
  const mutation = trpc.feed.updatePost.useMutation({
    onSuccess: () => {
      // Local update via `onSaved` gives instant feedback; the invalidate
      // catches any other place the post appears (feeds, timeline).
      onSaved(body.trim());
      void utils.feed.invalidate();
      void utils.project.timeline.invalidate();
    },
  });
  const trimmed = body.trim();
  const dirty = trimmed !== initialBody.trim();
  const tooLong = trimmed.length > 5000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit post"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Edit post</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Only the body is editable — attachments stay as posted.
          </p>
        </header>

        <div className="px-5 py-4">
          <textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="mt-1.5 text-right text-xs text-muted-foreground">
            <span className={tooLong ? "text-destructive" : undefined}>{trimmed.length}</span> / 5000
          </p>
          {mutation.error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {mutation.error.message}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!dirty || !trimmed || tooLong || mutation.isPending}
            loading={mutation.isPending}
            onClick={() => mutation.mutate({ id: postId, body: trimmed })}
          >
            Save changes
          </Button>
        </footer>
      </div>
    </div>
  );
}

