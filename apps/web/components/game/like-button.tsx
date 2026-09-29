"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { HeartIcon } from "lucide-react";

import { toggleLikeAction } from "@/app/actions/like";
import { Button } from "@/components/ui/button";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { cn } from "@/lib/utils";

export function LikeButton({
  gameId,
  liked,
  likeCount,
}: {
  gameId: string;
  liked: boolean;
  likeCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const formData = new FormData();
    formData.set("gameId", gameId);
    startTransition(async () => {
      const result = await toggleLikeAction(formData);
      if (result.ok) router.refresh();
    });
  }

  const classes = cn(
    "h-12 shrink-0 gap-1.5 rounded-full border-iron px-4 text-paper-white",
    liked && "border-ice-signal bg-ice-soft text-ice-signal",
  );
  const label = liked ? "Unlike game" : "Like game";
  const content = (
    <>
      <HeartIcon className={cn("size-5", liked && "fill-current")} strokeWidth={1.5} />
      <span className="stat-mono text-xs">{likeCount}</span>
    </>
  );

  const control = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={pending}
      onClick={toggle}
      aria-label={label}
      aria-pressed={liked}
      className={classes}
    >
      {content}
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
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-label="Sign in to like"
            className={classes}
          >
            {content}
          </Button>
        </SignInButton>
      </Show>
    </>
  );
}
