import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TedisMark } from "@/components/brand/tedis-mark";
import { legal } from "@/config/legal";

/**
 * Shared chrome for the legal documents. Deliberately outside the (app) group:
 * these pages must be readable while signed out, so they carry no app shell,
 * no auth requirement, and no data fetching.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <Link href="/" className="flex min-h-touch items-center gap-2 font-semibold tracking-tight">
            <TedisMark size={26} />
            TedIS
          </Link>
          <Link
            href="/"
            className="flex min-h-touch items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {legal.entityName}
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/cookies" className="hover:text-foreground">Cookies</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
