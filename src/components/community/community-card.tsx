import Link from "next/link";
import { Users, MessagesSquare } from "lucide-react";
import type { RouterOutputs } from "@/lib/trpc/types";

type Community = RouterOutputs["community"]["list"]["items"][number];

export function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      href={`/communities/${community.slug}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight group-hover:text-primary">{community.name}</h3>
        {community.interest && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: (community.interest.accentColor ?? "#7c5cff") + "1a", color: community.interest.accentColor ?? "#7c5cff" }}
          >
            {community.interest.name}
          </span>
        )}
      </div>
      {community.purpose && <p className="line-clamp-2 text-sm text-muted-foreground">{community.purpose}</p>}
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users size={14} /> {community.membersCount.toLocaleString()}</span>
        <span className="flex items-center gap-1"><MessagesSquare size={14} /> {community.threadsCount}</span>
      </div>
    </Link>
  );
}
