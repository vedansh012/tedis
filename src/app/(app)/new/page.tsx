"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STATUSES = ["IDEA", "BUILDING", "LIVE", "PAUSED"] as const;

export default function NewProjectPage() {
  const router = useRouter();
  const interests = trpc.interest.list.useQuery();
  const techs = trpc.technology.list.useQuery();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [interestId, setInterestId] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("BUILDING");
  const [repoUrl, setRepoUrl] = useState("");
  const [openToCollab, setOpenToCollab] = useState(false);
  const [techIds, setTechIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const create = trpc.project.create.useMutation({
    onSuccess: (p) => {
      router.push(`/projects/${p.slug}`);
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  function toggleTech(id: string) {
    setTechIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Give your project a name.");
    create.mutate({
      name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      interestId: interestId || undefined,
      status,
      repoUrl: repoUrl.trim() || undefined,
      openToCollab,
      techIds: [...techIds],
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">
          Showcase what you&rsquo;re building. Just want to share an update?{" "}
          <Link href="/home" className="font-medium text-primary hover:underline">Post to your feed</Link>.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Atlas Agents" />
        <Field label="Tagline" name="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line on what it does" maxLength={140} />

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is it, why does it matter, what have you built so far?" className="min-h-28" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="interest">Interest</Label>
            <select id="interest" value={interestId} onChange={(e) => setInterestId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">No topic</option>
              {interests.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize">
              {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
            </select>
          </div>
        </div>

        <Field label="Repository URL" name="repoUrl" type="url" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/you/project" />

        <div className="space-y-1.5">
          <Label>Tech stack</Label>
          <div className="flex flex-wrap gap-1.5">
            {techs.data?.map((t) => {
              const active = techIds.has(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggleTech(t.id)} aria-pressed={active}
                  className={cn("rounded-full border px-3 py-1 text-sm transition-colors",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={openToCollab} onChange={(e) => setOpenToCollab(e.target.checked)} className="size-4 rounded border-input" />
          Open to collaborators
        </label>

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Link href="/home"><Button type="button" variant="ghost">Cancel</Button></Link>
          <Button type="submit" loading={create.isPending}>Create project</Button>
        </div>
      </form>
    </div>
  );
}
