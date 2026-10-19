"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Show } from "@clerk/nextjs";

import { useAuthDialog } from "@/components/shell/auth-dialog";
import { BookmarkIcon } from "lucide-react";

import { toggleBookmarkAction } from "@/app/actions/bookmark";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { notifyReason, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function BookmarkButton({
  gameId,
  bookmarked,
  compact = false,
}: {
  gameId: string;
  bookmarked: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const openAuth = useAuthDialog();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const formData = new FormData();
    formData.set("gameId", gameId);
    startTransition(async () => {
      const result = await toggleBookmarkAction(formData);
      if (!result.ok) {
        notifyReason("Couldn't update that bookmark.", result.reason);
        return;
      }
      notifySuccess(bookmarked ? "Bookmark removed." : "Game bookmarked.");
      router.refresh();
    });
  }

  const classes = cn(
    compact
      ? "size-9 rounded-lg border-iron text-paper-white"
      : "size-12 shrink-0 rounded-full border-iron text-paper-white",
    bookmarked && "border-ice-signal bg-ice-soft text-ice-signal",
  );
  const label = bookmarked ? "Remove bookmark" : "Bookmark game";
  const icon = pending ? (
    <Spinner />
  ) : (
    <BookmarkIcon
      className={cn(compact ? "size-4" : "size-5", bookmarked && "fill-current")}
      strokeWidth={1.5}
    />
  );

  const control = (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "icon-lg"}
      disabled={pending}
      onClick={toggle}
      aria-label={label}
      aria-pressed={bookmarked}
      className={classes}
    >
      {icon}
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
          size={compact ? "icon" : "icon-lg"}
          aria-label="Sign in to bookmark"
          className={classes}
          onClick={openAuth}
        >
          {icon}
        </Button>
      </Show>
    </>
  );
}
