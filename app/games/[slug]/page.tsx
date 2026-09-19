import { notFound } from "next/navigation";

import { GameDetail } from "@/components/game/game-detail";
import { getCurrentUserId } from "@/lib/auth-admin";
import { getIsoWeekUtc } from "@/lib/iso-week";
import { getGameBoardContext } from "@/lib/queries";
import type { RankedGame } from "@/lib/types";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await getCurrentUserId();
  const context = await getGameBoardContext(slug, userId);
  if (!context) notFound();

  const current = getIsoWeekUtc();
  const liveBoard = context.listings.find(
    (board) => board.year === current.year && board.week === current.week,
  );
  const board = liveBoard ?? context.listings[0];
  const ranked = board?.games.find((game) => game.slug === slug);

  const game: RankedGame = ranked ?? {
    id: context.game.id,
    slug: context.game.slug,
    name: context.game.name,
    tagline: context.game.tagline,
    description: context.game.description,
    coverUrl: context.game.coverUrl,
    trailerUrl: context.game.trailerUrl,
    developerName: context.game.developerName,
    primaryUrl: context.game.primaryUrl,
    status: context.game.status,
    tags: context.game.tags ?? [],
    platforms: context.game.platforms ?? [],
    outboundClicks: context.game.outboundClicks,
    featured: false,
    voteCount: 0,
    voted: false,
    rank: 0,
  };

  const year = board?.year ?? current.year;
  const week = board?.week ?? current.week;
  const live = board?.live ?? false;

  return <GameDetail game={game} year={year} week={week} live={live} />;
}
