"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { ChevronUpIcon } from "lucide-react";

import { toggleVoteAction } from "@/app/actions/vote";
import { Button } from "@/components/ui/button";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { cn } from "@/lib/utils";

export function VoteButton({
  gameId,
  year,
  week,
  voteCount,
  voted,
  live,
  compact = false,
  wide = false,
  className,
}: {
  gameId: string;
  year: number;
  week: number;
  voteCount: number;
  voted: boolean;
  live: boolean;
  compact?: boolean;
  wide?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function vote() {
    const formData = new FormData();
    formData.set("gameId", gameId);
    formData.set("year", String(year));
    formData.set("week", String(week));
    startTransition(async () => {
      const result = await toggleVoteAction(formData);
      if (result.ok) router.refresh();
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
      disabled={!live || pending}
      onClick={vote}
      className={classes}
    >
      <ChevronUpIcon data-icon="inline-start" />
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
        {live ? (
          <SignInButton mode="modal">
            <Button
              type="button"
              variant="outline"
              size={compact ? "sm" : wide ? "lg" : "default"}
              className={classes}
            >
              <ChevronUpIcon data-icon="inline-start" />
              {wide ? "Vote" : null}
              <span className="stat-mono text-xs">{voteCount}</span>
            </Button>
          </SignInButton>
        ) : (
          control
        )}
      </Show>
    </>
  );
}
