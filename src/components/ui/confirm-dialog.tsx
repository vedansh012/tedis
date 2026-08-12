"use client";

import { Button } from "@/components/ui/button";

/**
 * Small centered modal for confirming a decision that can't be undone from
 * inside the UI (delete post, delete project). Kept intentionally boring —
 * the button is the whole point.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  destructive,
  disabled,
  onCancel,
  onConfirm,
  errorMessage,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  errorMessage?: string | null;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          {errorMessage && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}
        </div>
        <footer className="mt-4 flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>Cancel</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            disabled={disabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  );
}
