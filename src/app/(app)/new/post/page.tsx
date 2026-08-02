"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Composer } from "@/components/feed/composer";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Standalone "write a post" page reached from Create → Post. It reuses the
 * feed Composer unchanged; the only addition is navigating to the feed once the
 * post lands, since there is no surrounding feed here to reveal it in place.
 */
export default function NewPostPage() {
  const router = useRouter();
  const me = trpc.auth.me.useQuery();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
        <p className="text-sm text-muted-foreground">
          Share an update with your feed. Building something bigger?{" "}
          <Link href="/new/project" className="font-medium text-primary hover:underline">Create a project</Link>.
        </p>
      </header>

      {me.data ? (
        <Composer
          user={{ displayName: me.data.displayName, avatarUrl: null }}
          onPosted={() => {
            router.push("/home");
            router.refresh();
          }}
        />
      ) : (
        <Skeleton className="h-44 rounded-xl" />
      )}
    </div>
  );
}
