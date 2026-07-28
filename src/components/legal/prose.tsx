import { legal } from "@/config/legal";

/**
 * Minimal typographic primitives for the legal documents. Hand-rolled rather
 * than pulling in @tailwindcss/typography for three static pages — it keeps the
 * dependency surface (and the CSS bundle) unchanged.
 */

export function LegalTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 border-b border-border pb-6">
      <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-pretty text-muted-foreground">{subtitle}</p>}
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated{" "}
        <time dateTime={legal.lastUpdated}>
          {new Date(legal.lastUpdated).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
      </p>
    </div>
  );
}

export function Section({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8 first:mt-0">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-pretty">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-border">{children}</ul>;
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}

/** Callout for the "this is not legal advice" style notices. */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 text-[15px] leading-relaxed">
      {children}
    </div>
  );
}

/** Responsive table: scrolls horizontally on narrow screens rather than overflowing. */
export function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b border-border bg-secondary/40">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-medium text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.join("|")}>
              {r.map((cell, i) => (
                <td key={i} className="px-4 py-2.5 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
