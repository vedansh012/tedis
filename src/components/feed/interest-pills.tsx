"use client";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

/** Horizontal Interest filter for the home feed. `value=null` means "All". */
export function InterestPills({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const interests = trpc.interest.mine.useQuery();

  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      <Pill active={value === null} onClick={() => onChange(null)} label="All" />
      {interests.data?.map((u) => (
        <Pill
          key={u.interest.id}
          active={value === u.interest.id}
          onClick={() => onChange(u.interest.id)}
          label={u.interest.name}
          color={u.interest.accentColor}
        />
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
      style={active && color ? { backgroundColor: color, color: "#fff" } : undefined}
    >
      {label}
    </button>
  );
}
