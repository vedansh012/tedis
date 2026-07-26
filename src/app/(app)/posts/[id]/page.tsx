"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PostCard } from "@/components/feed/post-card";
import { CommentSection } from "@/components/feed/comment-section";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostDetailPage() {
  const id = String(useParams().id);
  const post = trpc.feed.post.useQuery({ id });

  if (post.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  if (!post.data) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">This post doesn&rsquo;t exist or was removed.</p>
        <Link href="/home" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">Back to feed</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Feed
      </Link>
      <PostCard post={post.data} />
      <CommentSection postId={id} count={post.data.commentsCount} />
    </div>
  );
}
