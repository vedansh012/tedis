"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AdminReports() {
  const utils = trpc.useUtils();
  const reports = trpc.admin.reports.useQuery();
  const resolve = trpc.admin.resolveReport.useMutation({
    onSuccess: () => utils.admin.reports.invalidate(),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Reports queue</h1>
      {reports.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !reports.data || reports.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No open reports. 🎉
        </div>
      ) : (
        <ul className="stagger space-y-2">
          {reports.data.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{r.targetType}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm font-medium">{r.reason}</p>
              {r.details && <p className="mt-0.5 text-sm text-muted-foreground">{r.details}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                Reported by @{r.reporter.username} · target <code className="rounded bg-secondary px-1">{r.targetId}</code>
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" loading={resolve.isPending}
                  onClick={() => resolve.mutate({ reportId: r.id, action: "RESOLVED" })}>
                  Resolve
                </Button>
                <Button size="sm" variant="ghost" loading={resolve.isPending}
                  onClick={() => resolve.mutate({ reportId: r.id, action: "DISMISSED" })}>
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
