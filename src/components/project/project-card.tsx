import Link from "next/link";
import { FileText, FolderGit2 } from "lucide-react";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { RouterOutputs } from "@/lib/trpc/types";

type Project = RouterOutputs["project"]["trending"][number];

const STATUS_STYLES: Record<string, string> = {
  IDEA: "bg-secondary text-secondary-foreground",
  BUILDING: "bg-warning/15 text-warning",
  LIVE: "bg-success/15 text-success",
  PAUSED: "bg-secondary text-muted-foreground",
  ARCHIVED: "bg-secondary text-muted-foreground",
};

export function ProjectCard({ project }: { project: Project }) {
  const postCount = project._count.posts;
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    >
      {/* Cover */}
      <div className="relative flex h-24 items-center justify-center bg-secondary/40 text-muted-foreground">
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <FolderGit2 size={26} className="opacity-50" />
        )}
        <Badge className={`absolute right-2 top-2 ${STATUS_STYLES[project.status]}`}>{project.status.toLowerCase()}</Badge>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-semibold leading-tight group-hover:text-primary">{project.name}</h3>
        {project.tagline && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.tagline}</p>}

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar src={project.owner.profile?.avatarUrl} name={project.owner.displayName} size={20} />
          <span className="truncate">{project.owner.displayName}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1" title="Posts in this project">
            <FileText size={13} /> {postCount} {postCount === 1 ? "post" : "posts"}
          </span>
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground">
          {postCount > 0 ? `Latest update ${timeAgo(project.updatedAt)}` : "No posts yet"}
        </p>
      </div>
    </Link>
  );
}
