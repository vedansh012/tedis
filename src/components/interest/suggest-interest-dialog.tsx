"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, PartyPopper } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { SUGGEST_LIMITS, INTEREST_REWARD_POINTS } from "@/features/interest/constants";

/**
 * "Suggest a New Interest" modal. Submits a request for admin review; on success
 * shows a reward-teasing confirmation. Same portal + motion pattern as ReportDialog.
 */
export function SuggestInterestDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");

  const suggest = trpc.interest.suggest.useMutation();

  const canSubmit =
    name.trim().length >= SUGGEST_LIMITS.name.min &&
    description.trim().length >= SUGGEST_LIMITS.description.min &&
    reason.trim().length >= SUGGEST_LIMITS.reason.min;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suggest a new interest"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm duration-200 animate-in fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl duration-200 ease-out animate-in fade-in slide-in-from-bottom-4 sm:max-h-[85dvh] sm:rounded-2xl sm:pb-5 sm:zoom-in-95"
      >
        {suggest.isSuccess ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <PartyPopper size={24} />
            </div>
            <p className="font-medium">Suggestion sent</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Our team will review it. If it&rsquo;s published, you&rsquo;ll earn{" "}
              <span className="font-medium text-foreground">+{INTEREST_REWARD_POINTS} points</span> and a thank-you.
            </p>
            <Button size="sm" className="mt-4" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h2 className="text-base font-semibold">Suggest a new interest</h2>
                  <p className="text-xs text-muted-foreground">Can&rsquo;t find your topic? Propose it.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Interest name" hint={`${name.length}/${SUGGEST_LIMITS.name.max}`}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, SUGGEST_LIMITS.name.max))}
                  placeholder="e.g. Quantum Computing"
                  className={inputCls}
                />
              </Field>

              <Field label="Short description" hint={`${description.length}/${SUGGEST_LIMITS.description.max}`}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, SUGGEST_LIMITS.description.max))}
                  placeholder="What does this topic cover?"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <Field label="Why should it be added?" hint={`${reason.length}/${SUGGEST_LIMITS.reason.max}`}>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, SUGGEST_LIMITS.reason.max))}
                  placeholder="Who would use it, and what would they post about?"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>

            {suggest.error && <p className="mt-2 text-sm text-destructive">{suggest.error.message}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                disabled={!canSubmit}
                loading={suggest.isPending}
                onClick={() =>
                  suggest.mutate({ name: name.trim(), description: description.trim(), reason: reason.trim() })
                }
              >
                Submit suggestion
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs tabular-nums text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
