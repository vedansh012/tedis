"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

/** Opens (or reuses) a DM with this user and navigates to it. Blocked pairs are
 *  refused server-side. */
export function MessageButton({ userId }: { userId: string }) {
  const router = useRouter();
  const open = trpc.message.openDirect.useMutation({
    onSuccess: (convo) => router.push(`/messages?c=${convo.id}`),
  });
  return (
    <Button
      variant="outline"
      size="sm"
      loading={open.isPending}
      onClick={() => open.mutate({ userId })}
    >
      <MessageCircle size={16} /> Message
    </Button>
  );
}
