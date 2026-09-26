"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheckIcon, Gamepad2Icon } from "lucide-react";

import { VoteButton } from "@/components/game/vote-button";
import { PlatformChipList } from "@/components/game/platform-chip";
import { Badge } from "@/components/ui/badge";
import { GAME_STATUS_LABELS } from "@/lib/constants";
import type { RankedGame } from "@/lib/types";

export function GameCardGrid({
  games,
  year,
  week,
  live,
}: {
  games: RankedGame[];
  year: number;
  week: number;
  live: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {games.map((game) => (
        <article
          key={game.id}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-graphite"
        >
          <span className="stat-mono w-5 shrink-0 text-xs text-fog">{game.rank}</span>
          <Link
            href={`/games/${game.slug}`}
            className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-graphite sm:size-14"
          >
            <Image src={game.logoUrl} alt="" fill className="object-contain p-1.5" sizes="56px" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link href={`/games/${game.slug}`} className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-paper-white">{game.name}</span>
              <BadgeCheckIcon className="size-3.5 shrink-0 text-ice-strong" />
            </Link>
            <p className="truncate text-xs text-fog">{game.tagline}</p>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              <Badge variant="secondary">{GAME_STATUS_LABELS[game.status]}</Badge>
              {game.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              <span className="inline-flex items-center gap-1 text-xs text-fog">
                <Gamepad2Icon className="size-3" />
                <PlatformChipList
                  platforms={game.platforms}
                  chipClassName="border-0 bg-transparent px-0 py-0 text-xs normal-case tracking-normal"
                />
              </span>
            </div>
          </div>
          <VoteButton
            gameId={game.id}
            year={year}
            week={week}
            voteCount={game.voteCount}
            voted={game.voted}
            live={live}
            compact
          />
        </article>
      ))}
    </div>
  );
}
