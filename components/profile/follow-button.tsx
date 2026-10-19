"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Show } from "@clerk/nextjs";

import { useAuthDialog } from "@/components/shell/auth-dialog";

import { toggleFollowAction } from "@/app/actions/follow";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { notifyReason, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function FollowButton({
  profileUserId,
  following,
}: {
  profileUserId: string;
  following: boolean;
}) {
  const router = useRouter();
  const openAuth = useAuthDialog();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const formData = new FormData();
    formData.set("profileUserId", profileUserId);
    startTransition(async () => {
      const result = await toggleFollowAction(formData);
      if (!result.ok) {
        notifyReason("Couldn't update that follow.", result.reason);
        return;
      }
      notifySuccess(following ? "Unfollowed." : "Following.");
      router.refresh();
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
      {pending ? <Spinner data-icon="inline-start" /> : null}
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
        <Button
          type="button"
          variant="outline"
          aria-label="Sign in to follow"
          className="rounded-full"
          onClick={openAuth}
        >
          Follow
        </Button>
      </Show>
    </>
  );
}
