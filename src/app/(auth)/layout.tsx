import Link from "next/link";
import { TedisMark } from "@/components/brand/tedis-mark";

/** Centered shell for all auth screens. Server Component — no client JS. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-96 bg-[radial-gradient(50%_50%_at_50%_0%,hsl(var(--primary)/0.14),transparent_70%)]"
      />
      <header className="mx-auto w-full max-w-md px-6 py-6">
        <Link href="/" className="flex min-h-touch items-center gap-2 text-lg font-semibold tracking-tight">
          <TedisMark size={30} priority />
          TedIS
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
