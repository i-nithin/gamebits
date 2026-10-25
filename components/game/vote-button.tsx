"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Show } from "@clerk/nextjs";

import { useAuthDialog } from "@/components/shell/auth-dialog";
import { ChevronUpIcon } from "lucide-react";

import { toggleVoteAction } from "@/app/actions/vote";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { notifyReason, notifySuccess } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function VoteButton({
  gameId,
  year,
  week,
  voteCount,
  voted,
  open,
  compact = false,
  wide = false,
  className,
}: {
  gameId: string;
  year: number;
  week: number;
  voteCount: number;
  voted: boolean;
  open: boolean;
  compact?: boolean;
  wide?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const openAuth = useAuthDialog();
  const [pending, startTransition] = useTransition();

  function vote() {
    const formData = new FormData();
    formData.set("gameId", gameId);
    formData.set("year", String(year));
    formData.set("week", String(week));
    startTransition(async () => {
      const result = await toggleVoteAction(formData);
      if (!result.ok) {
        notifyReason("Couldn't record that vote.", result.reason);
        return;
      }
      notifySuccess(voted ? "Vote removed." : "Vote recorded.");
      router.refresh();
    });
  }

  const classes = cn(
    wide
      ? "h-12 min-w-0 flex-1 flex-row rounded-full border-iron px-6 text-paper-white"
      : "flex flex-col gap-0.5 rounded-lg border-iron px-2 py-1 text-paper-white",
    voted && "border-ice-signal bg-ice-soft",
    className,
  );

  const control = (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : wide ? "lg" : "default"}
      disabled={!open || pending}
      onClick={vote}
      className={classes}
    >
      {pending ? <Spinner data-icon="inline-start" /> : <ChevronUpIcon data-icon="inline-start" />}
      {wide ? "Vote" : null}
      <span className="stat-mono text-xs">{voteCount}</span>
    </Button>
  );

  if (!clerkEnabled) {
    return control;
  }

  return (
    <>
      <Show when="signed-in">{control}</Show>
      <Show when="signed-out">
        {open ? (
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : wide ? "lg" : "default"}
            className={classes}
            onClick={openAuth}
          >
            <ChevronUpIcon data-icon="inline-start" />
            {wide ? "Vote" : null}
            <span className="stat-mono text-xs">{voteCount}</span>
          </Button>
        ) : (
          control
        )}
      </Show>
    </>
  );
}
