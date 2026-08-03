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
import { TrendingRail } from "@/components/app/trending-rail";

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
      {/*
        ---------- Desktop sidebar ----------
        Three width tiers, driven entirely by CSS (no JS breakpoint logic):
          <768   hidden (mobile chrome takes over below)
          768–1023  72px icon-only rail — labels/names collapse via `lg:inline`
          >=1024    260px labeled sidebar (also covers the wide/1440+ desktop tier;
                    the extra room past 1440 is left as margin for a future right rail)
      */}
      <aside className="fixed inset-y-0 left-0 hidden w-[72px] flex-col overflow-y-auto border-r border-border bg-background px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(0.75rem+env(safe-area-inset-left))] pt-[calc(1rem+env(safe-area-inset-top))] md:flex lg:w-[260px]">
        <Link href="/home" className="flex items-center justify-center gap-2 px-3 py-2 text-lg font-semibold tracking-tight lg:justify-start">
          <TedisMark size={28} />
          <span className="hidden lg:inline">TedIS</span>
        </Link>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              // aria-label overrides descendant text entirely, so it must carry
              // the unread count itself — otherwise that badge (visible, at
              // lg+) would silently vanish from the accessible name.
              aria-label={href === "/notifications" && unread.data ? `${label} (${unread.data} unread)` : label}
              className={cn(
                "flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start lg:py-2",
                isActive(href) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <span className="relative">
                <Icon size={18} />
                {href === "/notifications" && unread.data ? (
                  <span aria-hidden className="absolute -right-1 -top-1 block size-2 rounded-full bg-primary lg:hidden" />
                ) : null}
              </span>
              <span className="hidden lg:inline">{label}</span>
              {href === "/notifications" && unread.data ? (
                <span className="ml-auto hidden rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground lg:inline-block">
                  {unread.data > 99 ? "99+" : unread.data}
                </span>
              ) : null}
            </Link>
          ))}
          <Link
            href="/new"
            aria-label="Create"
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus size={18} />
            <span className="hidden lg:inline">Create</span>
          </Link>
        </nav>

        <div className="mt-auto space-y-1 border-t border-border pt-3">
          <Link
            href={`/u/${user.username}`}
            // Belt-and-braces: the visible name is `hidden` below `lg`, and
            // Avatar's initials fallback is itself aria-hidden, so a user with
            // no avatar image would otherwise leave this link with no
            // accessible name at the rail width.
            aria-label={`${user.displayName}'s profile`}
            className="flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary/60 lg:justify-start"
          >
            <Avatar src={user.avatarUrl} name={user.displayName} size={28} />
            <span className="hidden truncate font-medium lg:inline">{user.displayName}</span>
          </Link>
          <div className="flex flex-col items-center gap-1 px-1 lg:flex-row">
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex min-h-touch w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground lg:flex-1 lg:justify-start"
            >
              <Settings size={16} />
              <span className="hidden lg:inline">Settings</span>
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
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
        <Link href="/home" className="flex min-h-touch items-center gap-2 text-lg font-semibold tracking-tight">
          <TedisMark size={26} />
          TedIS
        </Link>
        <div className="flex items-center gap-0.5">
          <Link
            href="/search"
            aria-label="Search"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <Search size={20} />
          </Link>
          <ThemeToggle />
          <Link
            href={`/u/${user.username}`}
            aria-label="Your profile"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-lg hover:bg-secondary/60"
          >
            <Avatar src={user.avatarUrl} name={user.displayName} size={30} />
          </Link>
        </div>
      </header>

      {/* ---------- Main content ---------- */}
      <main className="md:pl-[72px] lg:pl-[260px] wide:pr-[320px]">
        {/*
          pb-nav-b clears the fixed bottom nav *and* the home indicator.

          Width is a true responsive max-width, not one fixed number: full-bleed
          on mobile, then a cap that grows per tier —
            <768   100% (16px gutters)
            md     680px (24px gutters) — tablet, alongside the icon-rail sidebar
            lg     fluid clamp(700px, 58vw, 800px) — "laptop" tier scales naturally
            wide   820px pinned (>=1440) — the GitHub/X-width desktop reading column
          `w-full` + `max-w-*` (never a bare `w-[Npx]`) is what keeps every tier
          fluid up to its cap instead of a hard-coded box.
        */}
        <div className="mx-auto w-full max-w-full px-4 py-6 pb-nav-b md:max-w-[680px] md:px-6 md:pb-10 lg:max-w-[clamp(700px,58vw,800px)] wide:max-w-[820px]">
          {children}
        </div>
      </main>

      {/* ---------- Desktop right rail (≥1440px) ---------- */}
      <TrendingRail />

      {/* ---------- Mobile bottom nav ---------- */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden"
      >
        {NAV.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <BottomLink key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
        ))}
        <Link
          href="/new"
          className="my-1 flex min-h-touch min-w-touch items-center justify-center self-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label="Create"
        >
          <Plus size={22} />
        </Link>
        <BottomLink href="/notifications" label="Alerts" icon={Bell} active={isActive("/notifications")} badge={unread.data} />
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="More"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-muted-foreground"
        >
          <MenuIcon size={20} />
          More
        </button>
      </nav>

      {/* ---------- Mobile "More" drawer ---------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DrawerLink href={`/u/${user.username}`} label="Profile" icon={User} onNavigate={() => setMenuOpen(false)} />
              {NAV.filter((n) => ["/search", "/projects", "/communities", "/messages", "/saved"].includes(n.href)).map((n) => (
                <DrawerLink key={n.href} href={n.href} label={n.label} icon={n.icon} onNavigate={() => setMenuOpen(false)} />
              ))}
              <DrawerLink href="/settings" label="Settings" icon={Settings} onNavigate={() => setMenuOpen(false)} />
            </div>
            <nav aria-label="Legal" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <Link href="/terms" onClick={() => setMenuOpen(false)} className="hover:text-foreground">Terms</Link>
              <Link href="/privacy" onClick={() => setMenuOpen(false)} className="hover:text-foreground">Privacy</Link>
              <Link href="/cookies" onClick={() => setMenuOpen(false)} className="hover:text-foreground">Cookies</Link>
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <ThemeToggle />
              <button
                onClick={() => { setMenuOpen(false); logout.mutate(); }}
                className="flex min-h-touch items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
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
      className="flex min-h-touch items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:border-foreground/20"
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium",
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
