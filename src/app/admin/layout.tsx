import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/require-admin";
import { ROLE_LABEL } from "@/features/admin/roles";

// Never index the admin panel.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/logs", label: "Logs" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 404s for non-staff — the panel's existence is never disclosed.
  const admin = await requireAdmin();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">ADMIN</span>
            TedIS
          </span>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {admin.displayName} · <span className="font-medium text-foreground">{ROLE_LABEL[admin.role]}</span>
            </span>
            <Link href="/home" className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-secondary">
              Exit
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
