"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLogs() {
  const logs = trpc.admin.auditLogs.useQuery();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Audit &amp; admin logs</h1>
      {logs.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
      ) : !logs.data || logs.data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No activity logged yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">IP</th>
                <th className="px-4 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.data.map((l) => (
                <tr key={l.id} className="bg-card">
                  <td className="px-4 py-2.5 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{l.actor ? `@${l.actor.username}` : "system"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{l.targetType ? `${l.targetType}:${l.targetId?.slice(0, 8)}` : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{l.ipAddress ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
