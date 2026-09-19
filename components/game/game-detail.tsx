import Image from "next/image";
import { BadgeCheckIcon } from "lucide-react";

import { VoteButton } from "@/components/game/vote-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GAME_STATUS_LABELS } from "@/lib/constants";
import { formatIsoWeekLabel } from "@/lib/iso-week";
import type { RankedGame } from "@/lib/types";

export function GameDetail({
  game,
  year,
  week,
  live,
}: {
  game: RankedGame;
  year: number;
  week: number;
  live: boolean;
}) {
  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8">
      <div className="relative h-56 overflow-hidden rounded-2xl card-ring sm:h-80">
        <Image
          src={game.coverUrl}
          alt=""
          fill
          className="object-cover"
          sizes="1000px"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-void via-void/30 to-transparent" />
        <div className="absolute right-4 bottom-4 left-4 flex flex-col items-start gap-3 sm:right-6 sm:bottom-6 sm:left-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-medium sm:text-[32px]">
              {game.name}
              <BadgeCheckIcon className="size-6 text-ice-strong" />
            </h1>
            <p className="text-sm text-fog">By {game.developerName}</p>
          </div>
          <VoteButton
            gameId={game.id}
            year={year}
            week={week}
            voteCount={game.voteCount}
            voted={game.voted}
            live={live}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{GAME_STATUS_LABELS[game.status]}</Badge>
        {game.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {game.platforms.map((platform) => (
          <Badge key={platform} variant="outline">
            {platform}
          </Badge>
        ))}
        <span className="text-xs text-fog">{formatIsoWeekLabel(year, week)}</span>
        {live ? null : <span className="text-xs text-fog">Ranking frozen</span>}
      </div>
      <p className="max-w-2xl text-sm leading-6 text-paper-white">{game.tagline}</p>
      <p className="max-w-2xl text-sm leading-6 text-fog">{game.description}</p>
      {game.trailerUrl ? (
        <a
          href={game.trailerUrl}
          className="text-sm text-ice-signal hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Watch trailer
        </a>
      ) : null}
      <a href={`/out/${game.slug}`}>
        <Button variant="outline" className="w-fit border-ice-signal text-paper-white">
          Play / Visit
        </Button>
      </a>
    </article>
  );
}
