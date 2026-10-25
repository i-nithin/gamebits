import { connection } from "next/server";

import { HomeBoard } from "@/components/board/home-board";
import { listLiveCarouselAds, listLiveSidebarAds } from "@/lib/ads";
import { getCurrentUserId } from "@/lib/auth-admin";
import { TREND_RAIL_LIMIT } from "@/lib/trending/config";
import { getIsoWeekUtc } from "@/lib/iso-week";
import { getWeekBoard } from "@/lib/queries";
import { listTopTrendingGames } from "@/lib/trending/queries";

export default async function HomePage() {
  await connection();
  const current = getIsoWeekUtc();
  const trendingPromise = listTopTrendingGames(TREND_RAIL_LIMIT);
  const userId = await getCurrentUserId();
  const [board, ads, carouselAds, trending] = await Promise.all([
    getWeekBoard(current.year, current.week, userId),
    listLiveSidebarAds(),
    listLiveCarouselAds(),
    trendingPromise,
  ]);

  return (
    <HomeBoard
      board={board}
      ads={ads}
      carouselAds={carouselAds}
      trending={trending}
    />
  );
}
