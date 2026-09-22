"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CopyIcon,
  GlobeIcon,
  MessageCircleIcon,
  PencilIcon,
  RocketIcon,
} from "lucide-react";

import { VoteButton } from "@/components/game/vote-button";
import type { GameLinkItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function IconBtn({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
      {...props}
    >
      {children}
    </button>
  );
}

export function GameItemToolbar({
  slug,
  links,
  canManage,
  vote,
}: {
  slug: string;
  links: GameLinkItem[];
  canManage: boolean;
  vote: {
    gameId: string;
    year: number;
    week: number;
    voteCount: number;
    voted: boolean;
    live: boolean;
  };
}) {
  const [copied, setCopied] = useState(false);
  const web = links.find((link) => link.kind === "web")?.url;
  const discord = links.find((link) => link.kind === "discord")?.url;
  const x = links.find((link) => link.kind === "x")?.url;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {web ? (
        <a
          href={web}
          target="_blank"
          rel="noreferrer"
          aria-label="Website"
          className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
        >
          <GlobeIcon className="size-4" strokeWidth={1.5} />
        </a>
      ) : null}
      {discord ? (
        <a
          href={discord}
          target="_blank"
          rel="noreferrer"
          aria-label="Discord"
          className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
        >
          <MessageCircleIcon className="size-4" strokeWidth={1.5} />
        </a>
      ) : null}
      {x ? (
        <a
          href={x}
          target="_blank"
          rel="noreferrer"
          aria-label="X"
          className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
        >
          <span className="text-xs font-medium">X</span>
        </a>
      ) : null}
      <IconBtn
        aria-label={copied ? "Copied" : "Copy link"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            setCopied(false);
          }
        }}
      >
        <CopyIcon className={cn("size-4", copied && "text-ice-signal")} strokeWidth={1.5} />
      </IconBtn>
      <VoteButton
        gameId={vote.gameId}
        year={vote.year}
        week={vote.week}
        voteCount={vote.voteCount}
        voted={vote.voted}
        live={vote.live}
        compact
      />
      {canManage ? (
        <>
          <Link
            href={`/games/${slug}/edit`}
            aria-label="Edit game"
            className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
          >
            <PencilIcon className="size-4" strokeWidth={1.5} />
          </Link>
          <Link
            href={`/games/${slug}/launch`}
            aria-label="Launch game"
            className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
          >
            <RocketIcon className="size-4" strokeWidth={1.5} />
          </Link>
        </>
      ) : null}
    </div>
  );
}
