"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL, type Role } from "@/features/admin/roles";

const STATUSES = ["ACTIVE", "SUSPENDED", "DEACTIVATED", "BANNED"] as const;
const ROLES: Role[] = ["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  SUSPENDED: "bg-warning/15 text-warning",
  DEACTIVATED: "bg-secondary text-muted-foreground",
  BANNED: "bg-destructive/15 text-destructive",
};

export default function AdminUsers() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const users = trpc.admin.users.useQuery({ query: debounced || undefined, limit: 30 });

  const onSettled = {
    onSuccess: () => {
      utils.admin.users.invalidate();
      utils.admin.metrics.invalidate();
      setNotice(null);
    },
    onError: (e: { message: string }) => setNotice(e.message),
  };
  const setStatus = trpc.admin.setUserStatus.useMutation(onSettled);
  const setRole = trpc.admin.setUserRole.useMutation(onSettled);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, @username, or email…"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-[color,box-shadow,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {notice && <p role="alert" className="text-sm font-medium text-destructive">{notice}</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="stagger divide-y divide-border">
            {users.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td className="px-4 py-3" colSpan={5}><Skeleton className="h-6 w-full" /></td></tr>
              ))
            ) : users.data && users.data.items.length > 0 ? (
              users.data.items.map((u) => (
                <tr key={u.id} className="bg-card">
                  <td className="px-4 py-3">
                    <Link href={`/u/${u.username}`} target="_blank" className="flex items-center gap-2 hover:underline">
                      <Avatar src={u.profile?.avatarUrl} name={u.displayName} size={28} />
                      <span>
                        <span className="font-medium">{u.displayName}</span>
                        <span className="block text-xs text-muted-foreground">@{u.username} · {u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[u.status]}`}>
                      {u.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ROLE_LABEL[u.role as Role]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Set status"
                        value={u.status}
                        disabled={setStatus.isPending}
                        onChange={(e) => setStatus.mutate({ userId: u.id, status: e.target.value as (typeof STATUSES)[number] })}
                        className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                      </select>
                      <select
                        aria-label="Set role"
                        value={u.role}
                        disabled={setRole.isPending}
                        onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as Role })}
                        className="h-8 rounded-md border border-input bg-background px-1.5 text-xs"
                        title="Super Admin only"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
