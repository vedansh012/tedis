"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewCommunityPage() {
  const router = useRouter();
  const interests = trpc.interest.list.useQuery();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [interestId, setInterestId] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "RESTRICTED">("PUBLIC");
  const [error, setError] = useState<string | null>(null);

  const create = trpc.community.create.useMutation({
    onSuccess: (c) => {
      router.push(`/communities/${c.slug}`);
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 3) return setError("Give your community a name.");
    if (!interestId) return setError("Choose a Interest for this community.");
    create.mutate({
      interestId,
      name: name.trim(),
      purpose: purpose.trim() || undefined,
      description: description.trim() || undefined,
      visibility,
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New community</h1>
        <p className="text-sm text-muted-foreground">A focused space inside an interest.</p>
      </header>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="LLM Fine-tuning" />
        <Field label="Purpose" name="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="One line on what this community is for" maxLength={140} />

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happens here? Who is it for?" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="interest">Interest</Label>
            <select id="interest" value={interestId} onChange={(e) => setInterestId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select a Interest…</option>
              {interests.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visibility">Visibility</Label>
            <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="PUBLIC">Public — anyone can join</option>
              <option value="RESTRICTED">Restricted — approval to join</option>
            </select>
          </div>
        </div>

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Link href="/communities"><Button type="button" variant="ghost">Cancel</Button></Link>
          <Button type="submit" loading={create.isPending}>Create community</Button>
        </div>
      </form>
    </div>
  );
}
