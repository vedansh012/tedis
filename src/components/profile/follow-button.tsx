"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button, type ButtonProps } from "@/components/ui/button";

export function FollowButton({
  userId,
  initialFollowing,
  size,
}: {
  userId: string;
  initialFollowing: boolean;
  size?: ButtonProps["size"];
}) {
  const [following, setFollowing] = useState(initialFollowing);

  const follow = trpc.profile.follow.useMutation({ onError: () => setFollowing(false) });
  const unfollow = trpc.profile.unfollow.useMutation({ onError: () => setFollowing(true) });

  function toggle() {
    if (following) {
      setFollowing(false);
      unfollow.mutate({ userId });
    } else {
      setFollowing(true);
      follow.mutate({ userId });
    }
  }

  return (
    <Button variant={following ? "outline" : "default"} size={size} onClick={toggle}>
      {following ? "Following" : "Follow"}
    </Button>
  );
}
