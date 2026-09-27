"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Show, SignInButton } from "@clerk/nextjs";

import { toggleFollowAction } from "@/app/actions/follow";
import { Button } from "@/components/ui/button";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { cn } from "@/lib/utils";

export function FollowButton({
  profileUserId,
  following,
}: {
  profileUserId: string;
  following: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const formData = new FormData();
    formData.set("profileUserId", profileUserId);
    startTransition(async () => {
      const result = await toggleFollowAction(formData);
      if (result.ok) router.refresh();
    });
  }

  const classes = cn(
    "rounded-full",
    following && "border-ice-signal bg-ice-soft text-ice-signal",
  );
  const label = following ? "Following" : "Follow";

  const control = (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={toggle}
      aria-label={following ? "Unfollow" : "Follow"}
      aria-pressed={following}
      className={classes}
    >
      {label}
    </Button>
  );

  if (!clerkEnabled) {
    return control;
  }

  return (
    <>
      <Show when="signed-in">{control}</Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button type="button" variant="outline" aria-label="Sign in to follow" className="rounded-full">
            Follow
          </Button>
        </SignInButton>
      </Show>
    </>
  );
}
