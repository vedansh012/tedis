import { describe, it, expect } from "vitest";
import { parseGitRepoUrl, isValidGitRepoUrl, normalizeGitRepoUrl, GIT_REPO_URL_MAX } from "./git-repo";

describe("parseGitRepoUrl — accepts valid public repos", () => {
  it("parses a GitHub repo and derives name + commits link", () => {
    const info = parseGitRepoUrl("https://github.com/prisma/prisma");
    expect(info).not.toBeNull();
    expect(info!.platform).toBe("github");
    expect(info!.owner).toBe("prisma");
    expect(info!.repo).toBe("prisma");
    expect(info!.name).toBe("prisma/prisma");
    expect(info!.commitsUrl).toBe("https://github.com/prisma/prisma/commits");
  });

  it("strips a trailing .git and normalizes", () => {
    expect(normalizeGitRepoUrl("https://github.com/vercel/next.js.git")).toBe("https://github.com/vercel/next.js");
  });

  it("supports GitLab and Bitbucket with correct commit paths", () => {
    expect(parseGitRepoUrl("https://gitlab.com/g/p")!.commitsUrl).toBe("https://gitlab.com/g/p/-/commits");
    expect(parseGitRepoUrl("https://bitbucket.org/g/p")!.commitsUrl).toBe("https://bitbucket.org/g/p/commits");
  });
});

describe("parseGitRepoUrl — rejects unsafe / malformed input", () => {
  const bad = [
    "",
    "not a url",
    "http://github.com/a/b", // non-HTTPS
    "ftp://github.com/a/b",
    "https://github.com/a/b/c", // extra path segments
    "https://github.com/onlyowner", // missing repo
    "https://evil.com/a/b", // unsupported host
    "https://user:pass@github.com/a/b", // embedded credentials
    "https://github.com:8080/a/b", // explicit port
    "https://github.com/a/..", // traversal-ish repo
    "javascript:alert(1)//github.com/a/b", // scheme injection
    `https://github.com/a/${"x".repeat(GIT_REPO_URL_MAX)}`, // over length cap
  ];
  it.each(bad)("rejects %s", (input) => {
    expect(parseGitRepoUrl(input)).toBeNull();
    expect(isValidGitRepoUrl(input)).toBe(false);
    expect(normalizeGitRepoUrl(input)).toBeNull();
  });
});
