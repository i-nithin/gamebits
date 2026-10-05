import { connection } from "next/server";

import { HomeBoard } from "@/components/board/home-board";
import { listLiveCarouselAds, listLiveSidebarAds } from "@/lib/ads";
import { getCurrentUserId } from "@/lib/auth-admin";
import { buildIsoWeekRange, getIsoWeekUtc } from "@/lib/iso-week";
import { getWeekBoard } from "@/lib/queries";

export default async function HomePage() {
  await connection();
  const current = getIsoWeekUtc();
  const userId = await getCurrentUserId();
  const weekRange = buildIsoWeekRange(current, 6, 6);
  const [weekBoards, ads, carouselAds] = await Promise.all([
    Promise.all(weekRange.map(({ year, week }) => getWeekBoard(year, week, userId))),
    listLiveSidebarAds(),
    listLiveCarouselAds(),
  ]);

  return (
    <HomeBoard
      weekBoards={weekBoards}
      currentWeek={current}
      ads={ads}
      carouselAds={carouselAds}
    />
  );
}
