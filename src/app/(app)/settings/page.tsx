"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { timeAgo } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarUpload } from "@/components/media/avatar-upload";
import Link from "next/link";
import { Monitor, ShieldCheck, TriangleAlert, Award } from "lucide-react";

export default function SettingsPage() {
  const me = trpc.auth.me.useQuery();
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>
      {me.data ? <ProfileSection username={me.data.username} /> : <Skeleton className="h-64 rounded-xl" />}
      <ContributionsSection />
      <SessionsSection />
      <LoginHistorySection />
      <DeleteAccountSection />
    </div>
  );
}

const REQ_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  APPROVED: "bg-success/15 text-success",
  MERGED: "bg-success/15 text-success",
  REJECTED: "bg-secondary text-muted-foreground",
};

function ContributionsSection() {
  const contrib = trpc.interest.myContribution.useQuery();
  const suggestions = contrib.data?.suggestions ?? [];

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Award size={14} /> Contributions
      </h2>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Award size={22} />
        </span>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{(contrib.data?.points ?? 0).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">reward points — thanks for helping build TedIS</p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your interest suggestions</p>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {suggestions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 bg-card px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  {s.publishedInterest ? (
                    <Link href={`/interest/${s.publishedInterest.slug}`} className="font-medium hover:underline">
                      {s.publishedInterest.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{s.name}</span>
                  )}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${REQ_STATUS_STYLE[s.status] ?? "bg-secondary"}`}>
                  {s.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const del = trpc.profile.deleteAccount.useMutation({
    onSuccess: () => {
      // Session is revoked + cookie cleared server-side; hard-reload to reset state.
      window.location.href = "/";
    },
  });

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-destructive">
        <TriangleAlert size={14} /> Danger zone
      </h2>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm font-medium">Delete your account</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently removes your profile and personal data and signs you out everywhere. Your posts remain but are
          shown as &ldquo;Deleted account&rdquo;. This cannot be undone.
        </p>

        {!open ? (
          <Button variant="destructive" size="sm" className="mt-4" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="del-pw">Confirm your password</Label>
              <input
                id="del-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm transition-[color,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="del-confirm">Type <span className="font-mono font-semibold">DELETE</span> to confirm</Label>
              <input
                id="del-confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm transition-[color,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
            {del.error && <p className="text-sm text-destructive">{del.error.message}</p>}
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                loading={del.isPending}
                disabled={!password || confirm !== "DELETE"}
                onClick={() => del.mutate({ password })}
              >
                Permanently delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileSection({ username }: { username: string }) {
  const utils = trpc.useUtils();
  const profile = trpc.profile.byUsername.useQuery({ username });
  const [form, setForm] = useState({ displayName: "", headline: "", bio: "", location: "", websiteUrl: "", avatarUrl: null as string | null });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setForm({
        displayName: profile.data.displayName,
        headline: profile.data.profile?.headline ?? "",
        bio: profile.data.profile?.bio ?? "",
        location: profile.data.profile?.location ?? "",
        websiteUrl: profile.data.profile?.websiteUrl ?? "",
        avatarUrl: profile.data.profile?.avatarUrl ?? null,
      });
    }
  }, [profile.data]);

  const update = trpc.profile.update.useMutation({
    onSuccess: async () => {
      setSaved(true);
      await Promise.all([utils.profile.byUsername.invalidate({ username }), utils.auth.me.invalidate()]);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (profile.isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Profile</h2>
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <AvatarUpload
          url={form.avatarUrl}
          name={form.displayName || username}
          onChange={(avatarUrl) => {
            setForm((f) => ({ ...f, avatarUrl }));
            update.mutate({ avatarUrl }); // persist immediately
          }}
        />
        <Field label="Display name" name="displayName" value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        <Field label="Headline" name="headline" value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder="What you're working on" maxLength={120} />
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={600} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" name="location" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Field label="Website" name="websiteUrl" type="url" value={form.websiteUrl}
            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://" />
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => update.mutate({
              displayName: form.displayName,
              headline: form.headline || null,
              bio: form.bio || null,
              location: form.location || null,
              websiteUrl: form.websiteUrl || "",
            })}
            loading={update.isPending}
          >
            Save changes
          </Button>
          {saved && <span className="text-sm text-success">Saved ✓</span>}
          {update.isError && <span className="text-sm text-destructive">{update.error.message}</span>}
        </div>
      </div>
    </section>
  );
}

function SessionsSection() {
  const utils = trpc.useUtils();
  const sessions = trpc.auth.listSessions.useQuery();
  const revoke = trpc.auth.revokeSession.useMutation({ onSuccess: () => utils.auth.listSessions.invalidate() });

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Monitor size={14} /> Active sessions
      </h2>
      {sessions.isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {sessions.data?.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {s.device ?? "Unknown device"}
                  {s.current && <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">This device</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress ?? "unknown IP"} · active {timeAgo(s.lastActiveAt)}
                </p>
              </div>
              {!s.current && (
                <Button variant="outline" size="sm" onClick={() => revoke.mutate({ sessionId: s.id })}>
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LoginHistorySection() {
  const history = trpc.auth.loginHistory.useQuery();
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <ShieldCheck size={14} /> Recent security activity
      </h2>
      {history.isLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card text-sm">
          {history.data?.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-3">
              <span className="font-medium">{e.type.replace(/_/g, " ").toLowerCase()}</span>
              <span className="text-xs text-muted-foreground">{e.ipAddress ?? "—"} · {timeAgo(e.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
