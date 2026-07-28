"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { REPORT_REASONS, type ReportTarget } from "@/features/moderation/constants";

/**
 * Reusable content/user report modal. Renders into a portal with a subtle
 * fade+scale entrance (matches the app's motion system). Shows a confirmation
 * state on success, then closes.
 */
export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  onClose,
}: {
  targetType: ReportTarget;
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);

  const report = trpc.moderation.report.useMutation({
    onSuccess: () => {
      setDone(true);
      setTimeout(onClose, 1400);
    },
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report content"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm duration-200 animate-in fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl duration-200 ease-out animate-in fade-in slide-in-from-bottom-4 sm:max-h-[85dvh] sm:rounded-2xl sm:pb-5 sm:zoom-in-95"
      >
        {done ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
              <ShieldCheck size={24} />
            </div>
            <p className="font-medium">Thanks for the report</p>
            <p className="mt-1 text-sm text-muted-foreground">Our team will review it shortly.</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold">Report {targetType.toLowerCase()}</h2>
                {targetLabel && <p className="text-xs text-muted-foreground">{targetLabel}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary">
                <X size={18} />
              </button>
            </div>

            <p className="mb-2 text-sm text-muted-foreground">Why are you reporting this?</p>
            <div className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    reason === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-[hsl(var(--primary))]"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              placeholder="Add details (optional)"
              rows={2}
              className="mt-3 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />

            {report.error && <p className="mt-2 text-sm text-destructive">{report.error.message}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                disabled={!reason}
                loading={report.isPending}
                onClick={() =>
                  report.mutate({ targetType, targetId, reason: reason as never, details: details.trim() || undefined })
                }
              >
                Submit report
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
