"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, Pencil, Trash2, Plus, Star } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InterestIcon } from "@/components/interest-icon";
import { IconPicker } from "@/components/interest/icon-picker";
import { INTEREST_REWARD_POINTS } from "@/features/interest/constants";

const DEFAULT_ACCENT = "#e8590c";
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

type Tab = "requests" | "manage";

export default function AdminInterests() {
  const [tab, setTab] = useState<Tab>("requests");
  const pendingCount = trpc.admin.interestRequestCount.useQuery();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Interests</h1>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-sm">
          <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
            Requests
            {pendingCount.data ? (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {pendingCount.data}
              </span>
            ) : null}
          </TabButton>
          <TabButton active={tab === "manage"} onClick={() => setTab("manage")}>Manage</TabButton>
        </div>
      </div>

      {tab === "requests" ? <RequestsPanel /> : <ManagePanel />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center rounded-md px-3 py-1.5 font-medium transition-colors ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// REQUESTS QUEUE
// ============================================================

const REQ_STATUSES = ["PENDING", "APPROVED", "REJECTED", "MERGED"] as const;

function RequestsPanel() {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<(typeof REQ_STATUSES)[number]>("PENDING");
  const [notice, setNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<null | { id: string; name: string }>(null);

  const list = trpc.admin.interestRequests.useQuery({ status });

  const refresh = () => {
    utils.admin.interestRequests.invalidate();
    utils.admin.interestRequestCount.invalidate();
    utils.admin.interests.invalidate();
  };
  const onErr = (e: { message: string }) => setNotice(e.message);

  const reject = trpc.admin.rejectInterestRequest.useMutation({ onSuccess: () => { refresh(); setNotice(null); }, onError: onErr });
  const merge = trpc.admin.mergeInterestRequest.useMutation({ onSuccess: () => { refresh(); setNotice(null); }, onError: onErr });

  const pending = list.data ?? [];
  const otherPending = (id: string) => pending.filter((r) => r.id !== id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-sm">
          {REQ_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {notice && <p role="alert" className="text-sm font-medium text-destructive">{notice}</p>}

      {list.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          {status === "PENDING" ? "No pending suggestions. 🎉" : `No ${status.toLowerCase()} requests.`}
        </div>
      ) : (
        <ul className="stagger space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{r.name}</h3>
                    {r._count.mergedFrom > 0 && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                        +{r._count.mergedFrom} merged
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                  <p className="mt-1.5 text-sm">
                    <span className="text-muted-foreground">Why: </span>{r.reason}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Avatar src={r.requester.profile?.avatarUrl} name={r.requester.displayName} size={22} />
                  <Link href={`/u/${r.requester.username}`} target="_blank" className="hover:underline">
                    @{r.requester.username}
                  </Link>
                </div>
              </div>

              {r.status === "PENDING" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Button size="sm" className="gap-1.5" onClick={() => setPublishing({ id: r.id, name: r.name })}>
                    <Sparkles size={14} /> Approve &amp; publish
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" loading={reject.isPending}
                    onClick={() => reject.mutate({ requestId: r.id })}>
                    <X size={14} /> Reject
                  </Button>
                  {otherPending(r.id).length > 0 && (
                    <select
                      aria-label="Merge into another request"
                      defaultValue=""
                      disabled={merge.isPending}
                      onChange={(e) => e.target.value && merge.mutate({ requestId: r.id, intoRequestId: e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground"
                    >
                      <option value="" disabled>Merge into…</option>
                      {otherPending(r.id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="capitalize">
                    {r.status.toLowerCase()}
                    {r.reviewedBy ? ` by ${r.reviewedBy.displayName}` : ""}
                    {r.reviewedAt ? ` · ${new Date(r.reviewedAt).toLocaleDateString()}` : ""}
                  </span>
                  {r.publishedInterest && (
                    <Link href={`/interest/${r.publishedInterest.slug}`} target="_blank" className="text-primary hover:underline">
                      → {r.publishedInterest.name}
                    </Link>
                  )}
                  {r.reviewNote && <span>· “{r.reviewNote}”</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {publishing && (
        <PublishModal
          requestId={publishing.id}
          initialName={publishing.name}
          duplicates={otherPending(publishing.id).map((r) => ({ id: r.id, name: r.name }))}
          onClose={() => setPublishing(null)}
          onDone={() => { setPublishing(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// PUBLISH MODAL
// ============================================================

function PublishModal({
  requestId,
  initialName,
  duplicates,
  onClose,
  onDone,
}: {
  requestId: string;
  initialName: string;
  duplicates: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(slugify(initialName));
  const [slugEdited, setSlugEdited] = useState(false);
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [iconKey, setIconKey] = useState<string | null>("sparkles");
  const [isFeatured, setIsFeatured] = useState(false);
  const [dupIds, setDupIds] = useState<string[]>([]);

  const publish = trpc.admin.publishInterest.useMutation({ onSuccess: onDone });

  return (
    <Modal title="Approve & publish interest" onClose={onClose}>
      <div className="space-y-3">
        <Row label="Name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            className={inputCls}
          />
        </Row>
        <Row label="Slug" hint="Used in the URL: /interest/…">
          <input
            value={slug}
            onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true); }}
            className={`${inputCls} font-mono`}
          />
        </Row>
        <Row label="Tagline" hint="optional">
          <input value={tagline} onChange={(e) => setTagline(e.target.value.slice(0, 80))} className={inputCls}
            placeholder="One-line description shown on the interest page" />
        </Row>
        <Row label="Accent">
          <div className="flex items-center gap-2">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background" />
            <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
              className={`${inputCls} w-28 font-mono uppercase`} />
          </div>
        </Row>
        <Row label="Icon">
          <IconPicker value={iconKey} accent={accentColor} onChange={setIconKey} />
        </Row>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
            className="accent-[hsl(var(--primary))]" />
          Feature on Explore
        </label>

        {duplicates.length > 0 && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Also resolve as duplicates (each requester is rewarded &amp; thanked):
            </p>
            <div className="space-y-1">
              {duplicates.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dupIds.includes(d.id)}
                    onChange={(e) =>
                      setDupIds((prev) => (e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)))
                    }
                    className="accent-[hsl(var(--primary))]"
                  />
                  {d.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {publish.error && <p className="mt-2 text-sm text-destructive">{publish.error.message}</p>}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Awards +{INTEREST_REWARD_POINTS} points to {dupIds.length + 1} requester{dupIds.length ? "s" : ""}.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="gap-1.5"
            loading={publish.isPending}
            disabled={name.trim().length < 2 || slug.length < 2}
            onClick={() =>
              publish.mutate({
                requestId,
                name: name.trim(),
                slug,
                tagline: tagline.trim() || undefined,
                accentColor,
                iconKey: iconKey || undefined,
                isFeatured,
                duplicateRequestIds: dupIds,
              })
            }
          >
            <Check size={14} /> Publish
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// MANAGE EXISTING INTERESTS
// ============================================================

function ManagePanel() {
  const utils = trpc.useUtils();
  const list = trpc.admin.interests.useQuery();
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<null | "new" | string>(null);

  const refresh = () => { utils.admin.interests.invalidate(); utils.interest.list.invalidate(); };
  const del = trpc.admin.deleteInterest.useMutation({
    onSuccess: () => { refresh(); setNotice(null); },
    onError: (e) => setNotice(e.message),
  });
  const update = trpc.admin.updateInterest.useMutation({ onSuccess: refresh, onError: (e) => setNotice(e.message) });

  const rows = list.data ?? [];
  const editingRow = typeof editing === "string" && editing !== "new" ? rows.find((r) => r.id === editing) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} live interests</p>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing("new")}>
          <Plus size={14} /> New interest
        </Button>
      </div>

      {notice && <p role="alert" className="text-sm font-medium text-destructive">{notice}</p>}

      {list.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Interest</th>
                <th className="px-4 py-2.5 font-medium">Builders</th>
                <th className="px-4 py-2.5 font-medium">Featured</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="stagger divide-y divide-border">
              {rows.map((u) => {
                const accent = u.accentColor ?? DEFAULT_ACCENT;
                return (
                  <tr key={u.id} className="bg-card">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: accent + "1a", color: accent }}>
                          <InterestIcon iconKey={u.iconKey} size={16} />
                        </span>
                        <span>
                          <span className="font-medium">{u.name}</span>
                          <span className="block font-mono text-xs text-muted-foreground">/{u.slug}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.membersCount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        aria-label="Toggle featured"
                        onClick={() => update.mutate({ id: u.id, isFeatured: !u.isFeatured })}
                        className={u.isFeatured ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"}
                      >
                        <Star size={16} fill={u.isFeatured ? "currentColor" : "none"} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2" onClick={() => setEditing(u.id)}>
                          <Pencil size={14} /> Edit
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-8 gap-1.5 px-2 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm(`Remove “${u.name}” from Explore?`)) del.mutate({ id: u.id }); }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <InterestFormModal
          key={typeof editing === "string" ? editing : "new"}
          existing={editingRow}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function InterestFormModal({
  existing,
  onClose,
  onDone,
}: {
  existing?: { id: string; name: string; slug: string; tagline: string | null; accentColor: string | null; iconKey: string | null; isFeatured: boolean };
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [tagline, setTagline] = useState(existing?.tagline ?? "");
  const [accentColor, setAccentColor] = useState(existing?.accentColor ?? DEFAULT_ACCENT);
  const [iconKey, setIconKey] = useState<string | null>(existing?.iconKey ?? "sparkles");
  const [isFeatured, setIsFeatured] = useState(existing?.isFeatured ?? false);

  const create = trpc.admin.createInterest.useMutation({ onSuccess: onDone });
  const update = trpc.admin.updateInterest.useMutation({ onSuccess: onDone });
  const busy = create.isPending || update.isPending;
  const error = create.error?.message ?? update.error?.message;

  return (
    <Modal title={isEdit ? `Edit ${existing!.name}` : "New interest"} onClose={onClose}>
      <div className="space-y-3">
        <Row label="Name">
          <input value={name}
            onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }}
            className={inputCls} />
        </Row>
        {!isEdit && (
          <Row label="Slug" hint="Used in the URL — permanent">
            <input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true); }}
              className={`${inputCls} font-mono`} />
          </Row>
        )}
        <Row label="Tagline" hint="optional">
          <input value={tagline} onChange={(e) => setTagline(e.target.value.slice(0, 80))} className={inputCls} />
        </Row>
        <Row label="Accent">
          <div className="flex items-center gap-2">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background" />
            <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
              className={`${inputCls} w-28 font-mono uppercase`} />
          </div>
        </Row>
        <Row label="Icon">
          <IconPicker value={iconKey} accent={accentColor} onChange={setIconKey} />
        </Row>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
            className="accent-[hsl(var(--primary))]" />
          Feature on Explore
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={busy} disabled={name.trim().length < 2 || (!isEdit && slug.length < 2)}
          onClick={() =>
            isEdit
              ? update.mutate({
                  id: existing!.id, name: name.trim(), tagline: tagline.trim() || null,
                  accentColor, iconKey: iconKey || null, isFeatured,
                })
              : create.mutate({
                  name: name.trim(), slug, tagline: tagline.trim() || undefined,
                  accentColor, iconKey: iconKey || undefined, isFeatured,
                })
          }>
          {isEdit ? "Save changes" : "Create interest"}
        </Button>
      </div>
    </Modal>
  );
}

// ============================================================
// SHARED MODAL PRIMITIVES
// ============================================================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm duration-200 animate-in fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl duration-200 ease-out animate-in fade-in slide-in-from-bottom-4 sm:rounded-2xl sm:zoom-in-95"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm transition-[color,box-shadow,border-color] duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
