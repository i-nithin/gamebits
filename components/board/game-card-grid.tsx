"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheckIcon } from "lucide-react";

import { VoteButton } from "@/components/game/vote-button";
import { Badge } from "@/components/ui/badge";
import { GAME_STATUS_LABELS } from "@/lib/constants";
import type { GamePlatformItem, RankedGame } from "@/lib/types";

function PlatformMark({ platform }: { platform: GamePlatformItem }) {
  return (
    <span
      title={platform.name}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-graphite"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={platform.logoUrl} alt={platform.name} className="size-5 object-contain" />
    </span>
  );
}

export function GameCardGrid({
  games,
  year,
  week,
  open,
}: {
  games: RankedGame[];
  year: number;
  week: number;
  open: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {games.map((game) => (
        <article
          key={game.id}
          className="relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-obsidian sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-graphite sm:size-14">
              <Image src={game.logoUrl} alt="" fill className="object-cover" sizes="56px" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-md font-medium text-paper-white">{game.name}</span>
              <p className="flex min-w-0 items-center gap-1 text-sm text-fog">
                <span className="truncate">{game.developerName}</span>
                <BadgeCheckIcon className="size-3.5 shrink-0 text-ice-strong" />
              </p>
            </div>
          </div>
          <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
            {game.categories.map((category) => (
              <Badge key={category.id} variant="secondary" className="dark:bg-black/55 border border-iron rounded-sm">
                {category.name}
              </Badge>
            ))}
            {game.platforms.map((platform) => (
              <PlatformMark key={platform.id} platform={platform} />
            ))}
          </div>
          <div className="relative z-10 justify-self-end">
            <VoteButton
              gameId={game.id}
              year={year}
              week={week}
              voteCount={game.voteCount}
              voted={game.voted}
              open={open}
              compact
              className="disabled:pointer-events-auto"
            />
          </div>
          <Link
            href={`/games/${game.slug}`}
            aria-label={game.name}
            className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          />
        </article>
      ))}
    </div>
  );
}
