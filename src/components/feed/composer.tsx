"use client";

import { useRef, useState, useCallback } from "react";
import { ImagePlus, Film, X, Loader2, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadFile, validateFile, type UploadedMedia } from "@/features/media/upload";
import { ACCEPT_IMAGE, ACCEPT_VIDEO, MAX_IMAGES_PER_POST, classifyUpload } from "@/features/media/constants";
import { isValidGitRepoUrl, GIT_REPO_URL_MAX } from "@/features/feed/git-repo";

const MAX_CHARS = 5000;

interface Pending {
  key: string;
  preview: string; // object URL
  kind: "IMAGE" | "VIDEO";
  status: "uploading" | "done" | "error";
  media?: UploadedMedia;
  error?: string;
}

let keyCounter = 0;

export function Composer({
  user,
  lockedProjectId,
  lockedProjectName,
}: {
  user: { displayName: string; avatarUrl: string | null };
  /** When set, every post is attached to this project and the project picker is hidden. */
  lockedProjectId?: string;
  lockedProjectName?: string;
}) {
  const utils = trpc.useUtils();
  const interests = trpc.interest.mine.useQuery();
  // Only needed for the free-standing composer's project picker.
  const myProjects = trpc.project.mine.useQuery(undefined, { enabled: !lockedProjectId });
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState("");
  const [interestId, setInterestId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showRepo, setShowRepo] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");

  // Inline validation: only complain once there's something to complain about.
  const repoTrimmed = repoUrl.trim();
  const repoInvalid = repoTrimmed.length > 0 && !isValidGitRepoUrl(repoTrimmed);

  const create = trpc.feed.createPost.useMutation({
    onSuccess: async () => {
      setBody("");
      setItems((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.preview));
        return [];
      });
      setNotice(null);
      setRepoUrl("");
      setShowRepo(false);
      setProjectId("");
      await utils.feed.home.invalidate();
      // Keep the attached project's timeline fresh.
      await utils.project.timeline.invalidate();
    },
    onError: (e) => setNotice(e.message),
  });

  const hasVideo = items.some((i) => i.kind === "VIDEO");
  const imageCount = items.filter((i) => i.kind === "IMAGE").length;
  const uploading = items.some((i) => i.status === "uploading");
  const readyMedia = items.filter((i) => i.status === "done" && i.media).map((i) => i.media!);
  const canPost =
    (body.trim().length > 0 || readyMedia.length > 0) && !uploading && !create.isPending && !repoInvalid;

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setNotice(null);
      const list = Array.from(files);
      for (const file of list) {
        const kind = classifyUpload(file.type);
        const err = validateFile(file);
        if (!kind || err) {
          setNotice(err ?? "Unsupported file.");
          continue;
        }
        // Enforce: one video, no mixing, max images.
        if (kind === "VIDEO" && (hasVideo || imageCount > 0)) {
          setNotice("You can add one video, or up to 6 images — not both.");
          continue;
        }
        if (kind === "IMAGE" && (hasVideo || imageCount >= MAX_IMAGES_PER_POST)) {
          setNotice(hasVideo ? "Remove the video to add images." : `Up to ${MAX_IMAGES_PER_POST} images per post.`);
          continue;
        }

        const key = `m${keyCounter++}`;
        const preview = URL.createObjectURL(file);
        setItems((prev) => [...prev, { key, preview, kind, status: "uploading" }]);

        uploadFile(file)
          .then((media) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: "done", media } : it))))
          .catch((e: Error) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: "error", error: e.message } : it))));
      }
    },
    [hasVideo, imageCount],
  );

  function removeItem(key: string) {
    setItems((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.key !== key);
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function submit() {
    if (!canPost) return;
    create.mutate({
      body: body.trim(),
      interestId: interestId || undefined,
      projectId: lockedProjectId ?? (projectId || undefined),
      gitRepoUrl: repoTrimmed || undefined,
      media: readyMedia.map((m) => ({ type: m.type, url: m.url, thumbnailUrl: m.thumbnailUrl, width: m.width, height: m.height })),
    });
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <div className="flex gap-3">
        <Avatar src={user.avatarUrl} name={user.displayName} size={40} />
        <div className="flex-1 space-y-3">
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value.slice(0, MAX_CHARS));
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 320)}px`;
            }}
            placeholder="What's on your mind?"
            aria-label="Write a post"
            rows={2}
            className="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none"
          />

          {dragging && (
            <p className="rounded-lg border border-dashed border-primary/50 py-4 text-center text-sm text-primary">
              Drop images or a video to add them
            </p>
          )}

          {items.length > 0 && (
            <div className={cn("grid gap-2", hasVideo ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-4")}>
              {items.map((it) => (
                <div key={it.key} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                  {it.kind === "VIDEO" ? (
                    <video src={it.preview} className="h-40 w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.preview} alt="" className="aspect-square w-full object-cover" />
                  )}
                  {it.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                  {it.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/70 p-1 text-center text-[10px] font-medium text-white">
                      {it.error ?? "Failed"}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    aria-label="Remove"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showRepo && (
            <div className="space-y-1">
              <div className="relative">
                <GitBranch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  inputMode="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value.slice(0, GIT_REPO_URL_MAX))}
                  placeholder="https://github.com/owner/repo"
                  aria-label="Git repository URL"
                  aria-invalid={repoInvalid}
                  className={cn(
                    "h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm transition-colors",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    repoInvalid
                      ? "border-destructive focus-visible:ring-destructive"
                      : "border-input focus-visible:ring-ring",
                  )}
                />
              </div>
              {repoInvalid ? (
                <p role="alert" className="text-xs text-destructive">
                  Enter a valid GitHub, GitLab, or Bitbucket repository URL.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Attach a public GitHub, GitLab, or Bitbucket repo.</p>
              )}
            </div>
          )}

          {notice && <p role="alert" className="text-sm font-medium text-destructive">{notice}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <input ref={imageInput} type="file" accept={ACCEPT_IMAGE} multiple hidden
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={videoInput} type="file" accept={ACCEPT_VIDEO} hidden
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />

            <button type="button" onClick={() => imageInput.current?.click()} disabled={hasVideo || imageCount >= MAX_IMAGES_PER_POST}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
              aria-label="Add images">
              <ImagePlus size={18} /> Photo
            </button>
            <button type="button" onClick={() => videoInput.current?.click()} disabled={hasVideo || imageCount > 0}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
              aria-label="Add video">
              <Film size={18} /> Video
            </button>
            <button type="button" onClick={() => setShowRepo((v) => !v)} aria-pressed={showRepo}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary hover:text-foreground",
                showRepo ? "text-primary" : "text-muted-foreground",
              )}
              aria-label="Attach a Git repository">
              <GitBranch size={18} /> Repo
            </button>

            <select value={interestId} onChange={(e) => setInterestId(e.target.value)} aria-label="Topic"
              className="h-9 max-w-[9rem] rounded-md border border-input bg-background px-2 text-sm">
              <option value="">No topic</option>
              {interests.data?.map((u) => (
                <option key={u.interest.id} value={u.interest.id}>{u.interest.name}</option>
              ))}
            </select>

            {/* Optional: add this post to a project's timeline. */}
            {lockedProjectId ? (
              <span className="flex h-9 items-center gap-1.5 rounded-md bg-secondary px-2.5 text-sm text-muted-foreground">
                📁 <span className="max-w-[9rem] truncate font-medium text-foreground">{lockedProjectName}</span>
              </span>
            ) : (
              myProjects.data && myProjects.data.length > 0 && (
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Attach to project"
                  className="h-9 max-w-[11rem] rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">No project</option>
                  {myProjects.data.map((pr) => (
                    <option key={pr.id} value={pr.id}>📁 {pr.name}</option>
                  ))}
                </select>
              )
            )}

            <div className="ml-auto flex items-center gap-3">
              {body.length > 0 && (
                <span className={cn("text-xs tabular-nums", body.length > MAX_CHARS - 100 ? "text-destructive" : "text-muted-foreground")}>
                  {body.length}/{MAX_CHARS}
                </span>
              )}
              <Button size="sm" disabled={!canPost} loading={create.isPending} onClick={submit}>
                {uploading ? "Uploading…" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
