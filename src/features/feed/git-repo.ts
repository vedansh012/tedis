/**
 * Git repository URL parsing + validation, shared by the client (composer
 * inline validation) and the server (authoritative enforcement + display
 * metadata). No node imports — safe in the browser bundle.
 *
 * Scope is deliberately narrow: public HTTPS repo URLs on the three hosts we
 * support. We keep only what the "Project Repo" card needs — no cloning, no API
 * calls. See PROJECT_STATE.md "Git Repository attachment".
 */

export type GitPlatform = "github" | "gitlab" | "bitbucket";

export interface GitRepoInfo {
  /** Canonical HTTPS URL with any trailing ".git"/slash stripped. */
  url: string;
  platform: GitPlatform;
  /** Human label for the platform ("GitHub" etc.). */
  platformLabel: string;
  owner: string;
  repo: string;
  /** "owner/repo" — used as the card title. */
  name: string;
  /** Deep link to commit history so viewers can track code updates. */
  commitsUrl: string;
}

const PLATFORMS: Record<GitPlatform, { host: string; label: string; commitsPath: (o: string, r: string) => string }> = {
  github: {
    host: "github.com",
    label: "GitHub",
    commitsPath: (o, r) => `/${o}/${r}/commits`,
  },
  gitlab: {
    host: "gitlab.com",
    label: "GitLab",
    commitsPath: (o, r) => `/${o}/${r}/-/commits`,
  },
  bitbucket: {
    host: "bitbucket.org",
    label: "Bitbucket",
    commitsPath: (o, r) => `/${o}/${r}/commits`,
  },
};

const HOST_TO_PLATFORM: Record<string, GitPlatform> = {
  "github.com": "github",
  "www.github.com": "github",
  "gitlab.com": "gitlab",
  "www.gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
  "www.bitbucket.org": "bitbucket",
};

/** Max characters accepted for the raw input (guards the DB column + UI). */
export const GIT_REPO_URL_MAX = 300;

/**
 * Parse and validate a Git repository URL. Returns `null` when the value is not
 * a valid public HTTPS repo URL on a supported host. The caller decides how to
 * surface the failure (inline error, tRPC BAD_REQUEST, etc.).
 */
export function parseGitRepoUrl(raw: string): GitRepoInfo | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > GIT_REPO_URL_MAX) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // HTTPS only — no ssh/git/http, no credentials, no ports.
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password || parsed.port) return null;

  const platform = HOST_TO_PLATFORM[parsed.hostname.toLowerCase()];
  if (!platform) return null;

  // Path must be exactly owner/repo. Extra segments (tree/blob/issues/…) are
  // rejected so the badge always points at a repo root, not a sub-page.
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return null;

  const owner = segments[0]!;
  let repo = segments[1]!;
  repo = repo.replace(/\.git$/i, "");

  // Conservative slug rules — matches what all three hosts allow in practice.
  const slug = /^[A-Za-z0-9._-]+$/;
  if (!slug.test(owner) || !slug.test(repo) || repo === "." || repo === "..") return null;

  const meta = PLATFORMS[platform];
  const url = `https://${meta.host}/${owner}/${repo}`;
  return {
    url,
    platform,
    platformLabel: meta.label,
    owner,
    repo,
    name: `${owner}/${repo}`,
    commitsUrl: `https://${meta.host}${meta.commitsPath(owner, repo)}`,
  };
}

/** Convenience boolean guard for form-level validation. */
export function isValidGitRepoUrl(raw: string): boolean {
  return parseGitRepoUrl(raw) !== null;
}

/** Normalize to the canonical URL for storage, or `null` if invalid. */
export function normalizeGitRepoUrl(raw: string): string | null {
  return parseGitRepoUrl(raw)?.url ?? null;
}
