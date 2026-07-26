"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const metrics = trpc.admin.metrics.useQuery(undefined, { refetchInterval: 30_000 });
  const m = metrics.data;

  const cards: { label: string; value: number | undefined; hint?: string }[] = [
    { label: "Total users", value: m?.totalUsers },
    { label: "Active accounts", value: m?.activeAccounts },
    { label: "Active sessions", value: m?.activeSessions, hint: "online proxy" },
    { label: "New users today", value: m?.newUsersToday },
    { label: "Posts", value: m?.totalPosts },
    { label: "Projects", value: m?.totalProjects },
    { label: "Comments", value: m?.totalComments },
    { label: "Media uploaded", value: m?.totalMedia },
    { label: "Open reports", value: m?.openReports },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <HealthPill healthy={!metrics.isError} loading={metrics.isLoading} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4 duration-200 animate-in fade-in">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
            {metrics.isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold tabular-nums">{(c.value ?? 0).toLocaleString()}</p>
            )}
            {c.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{c.hint}</p>}
          </div>
        ))}
      </div>

      <ActivitySection />

      <RecentActivity />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Platform health</h2>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <HealthRow label="API / tRPC" ok={!metrics.isError} />
          <HealthRow label="Database" ok={!metrics.isError} detail={metrics.isError ? "unreachable" : "connected"} />
          <HealthRow
            label="Last refresh"
            ok
            detail={m ? new Date(m.generatedAt).toLocaleTimeString() : "—"}
          />
        </div>
      </section>
    </div>
  );
}

function ActivitySection() {
  const activity = trpc.admin.activity.useQuery({ days: 14 });
  const data = activity.data ?? [];
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activity · last 14 days</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniChart title="New users" loading={activity.isLoading} points={data.map((d) => ({ label: d.date, value: d.users }))} />
        <MiniChart title="Posts" loading={activity.isLoading} points={data.map((d) => ({ label: d.date, value: d.posts }))} />
        <MiniChart title="Comments" loading={activity.isLoading} points={data.map((d) => ({ label: d.date, value: d.comments }))} />
      </div>
    </section>
  );
}

function MiniChart({ title, points, loading }: { title: string; points: { label: string; value: number }[]; loading: boolean }) {
  const total = points.reduce((a, p) => a + p.value, 0);
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="text-lg font-bold tabular-nums">{loading ? "—" : total.toLocaleString()}</p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-16 w-full" />
      ) : (
        <div className="mt-3 flex h-16 items-end gap-0.5" role="img" aria-label={`${title}: ${total} over 14 days`}>
          {points.map((p) => (
            <div
              key={p.label}
              title={`${new Date(p.label).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${p.value}`}
              className="flex-1 rounded-t bg-primary/70 transition-[height] duration-500 hover:bg-primary"
              style={{ height: `${Math.max(3, (p.value / max) * 100)}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentActivity() {
  const recent = trpc.admin.recentActivity.useQuery(undefined, { refetchInterval: 30_000 });
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Newest signups</h2>
        {recent.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : recent.data?.signups.length ? (
          <ul className="stagger space-y-1">
            {recent.data.signups.map((u) => (
              <li key={u.id}>
                <Link href={`/u/${u.username}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/60">
                  <Avatar src={u.profile?.avatarUrl} name={u.displayName} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.displayName}</span>
                    <span className="block truncate text-xs text-muted-foreground">@{u.username}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(u.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No signups yet.</Empty>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Latest posts</h2>
        {recent.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : recent.data?.posts.length ? (
          <ul className="stagger space-y-1">
            {recent.data.posts.map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/60">
                  <Avatar src={p.author.profile?.avatarUrl} name={p.author.displayName} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.body || "(media post)"}</span>
                    <span className="block truncate text-xs text-muted-foreground">@{p.author.username}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No posts yet.</Empty>
        )}
      </section>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className={cn("py-6 text-center text-sm text-muted-foreground")}>{children}</p>;
}

function HealthPill({ healthy, loading }: { healthy: boolean; loading: boolean }) {
  const state = loading ? "checking" : healthy ? "operational" : "degraded";
  const color = loading ? "bg-muted text-muted-foreground" : healthy ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>● {state}</span>;
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <span className={`size-2 rounded-full ${ok ? "bg-success" : "bg-destructive"}`} />
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{detail ?? (ok ? "ok" : "error")}</span>
    </div>
  );
}
