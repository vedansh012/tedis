import { GitBranch, History, ExternalLink } from "lucide-react";
import { parseGitRepoUrl } from "@/features/feed/git-repo";

/**
 * Compact "Project Repo" badge attached to a post. Renders nothing when the URL
 * is absent or unparseable, so it's safe to drop into any post view. Kept light:
 * repo name + platform label + links to the repo and its commit history.
 */
export function GitRepoCard({ url }: { url: string | null | undefined }) {
  if (!url) return null;
  const info = parseGitRepoUrl(url);
  if (!info) return null;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
        <GitBranch size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="block truncate text-sm font-medium hover:underline"
          title={info.name}
        >
          {info.name}
        </a>
        <span className="text-xs text-muted-foreground">Project repo · {info.platformLabel}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={info.commitsUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="View commit history"
        >
          <History size={14} /> Commits
        </a>
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          title="Open repository"
        >
          View <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
