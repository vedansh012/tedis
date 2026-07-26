"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Compass, FolderGit2, Users, Bell, Plus, Settings, LogOut, User, Search, Bookmark, MessagesSquare, Menu as MenuIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { TedisMark } from "@/components/brand/tedis-mark";

interface ShellUser {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
] as const;

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = trpc.notification.unreadCount.useQuery(undefined, { refetchInterval: 60_000 });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      router.push("/login");
      router.refresh();
    },
  });

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh bg-surface">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-background px-3 py-4 md:flex">
        <Link href="/home" className="flex items-center gap-2 px-3 py-2 text-lg font-semibold tracking-tight">
          <TedisMark size={28} />
          TedIS
        </Link>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(href) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
              {href === "/notifications" && unread.data ? (
                <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {unread.data > 99 ? "99+" : unread.data}
                </span>
              ) : null}
            </Link>
          ))}
          <Link
            href="/new"
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus size={18} /> Create
          </Link>
        </nav>

        <div className="mt-auto space-y-1 border-t border-border pt-3">
          <Link
            href={`/u/${user.username}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary/60"
          >
            <Avatar src={user.avatarUrl} name={user.displayName} size={28} />
            <span className="truncate font-medium">{user.displayName}</span>
          </Link>
          <div className="flex items-center gap-1 px-1">
            <Link href="/settings" className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
              <Settings size={16} /> Settings
            </Link>
            <ThemeToggle />
            <button
              onClick={() => logout.mutate()}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/home" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <TedisMark size={26} />
          TedIS
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/search" aria-label="Search" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground">
            <Search size={18} />
          </Link>
          <ThemeToggle />
          <Link href={`/u/${user.username}`} aria-label="Your profile">
            <Avatar src={user.avatarUrl} name={user.displayName} size={30} />
          </Link>
        </div>
      </header>

      {/* ---------- Main content ---------- */}
      <main className="md:pl-60">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 md:px-8 md:pb-10">{children}</div>
      </main>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
        {NAV.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <BottomLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
        ))}
        <Link
          href="/new"
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label="Create"
        >
          <Plus size={22} />
        </Link>
        <BottomLink href="/notifications" label="Alerts" icon={Bell} active={isActive("/notifications")} badge={unread.data} />
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="More"
          className="relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-muted-foreground"
        >
          <MenuIcon size={20} />
          More
        </button>
      </nav>

      {/* ---------- Mobile "More" drawer ---------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-background p-4 pb-8 shadow-xl duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Menu</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DrawerLink href={`/u/${user.username}`} label="Profile" icon={User} onNavigate={() => setMenuOpen(false)} />
              {NAV.filter((n) => ["/search", "/projects", "/communities", "/messages", "/saved"].includes(n.href)).map((n) => (
                <DrawerLink key={n.href} href={n.href} label={n.label} icon={n.icon} onNavigate={() => setMenuOpen(false)} />
              ))}
              <DrawerLink href="/settings" label="Settings" icon={Settings} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <ThemeToggle />
              <button
                onClick={() => { setMenuOpen(false); logout.mutate(); }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:border-foreground/20"
    >
      <Icon size={18} className="text-muted-foreground" />
      {label}
    </Link>
  );
}

function BottomLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon size={20} />
      {label}
      {badge ? (
        <span className="absolute right-4 top-0 rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
