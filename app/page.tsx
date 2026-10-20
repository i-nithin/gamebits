import { connection } from "next/server";

import { HomeBoard } from "@/components/board/home-board";
import { listLiveCarouselAds, listLiveSidebarAds } from "@/lib/ads";
import { getCurrentUserId } from "@/lib/auth-admin";
import { TREND_RAIL_LIMIT } from "@/lib/trending/config";
import { buildIsoWeekRange, getIsoWeekUtc } from "@/lib/iso-week";
import { getWeekBoard } from "@/lib/queries";
import { listTopTrendingGames } from "@/lib/trending/queries";

export default async function HomePage() {
  await connection();
  const current = getIsoWeekUtc();
  const weekRange = buildIsoWeekRange(current, 6, 6);
  const trendingPromise = listTopTrendingGames(TREND_RAIL_LIMIT);
  const userId = await getCurrentUserId();
  const [weekBoards, ads, carouselAds, trending] = await Promise.all([
    Promise.all(weekRange.map(({ year, week }) => getWeekBoard(year, week, userId))),
    listLiveSidebarAds(),
    listLiveCarouselAds(),
    trendingPromise,
  ]);

  return (
    <HomeBoard
      weekBoards={weekBoards}
      currentWeek={current}
      ads={ads}
      carouselAds={carouselAds}
      trending={trending}
    />
  );
}
