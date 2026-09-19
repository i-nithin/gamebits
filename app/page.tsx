import { HomeBoard } from "@/components/board/home-board";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUserId } from "@/lib/auth-admin";
import { buildIsoWeekRange, getIsoWeekUtc } from "@/lib/iso-week";
import { getWeekBoard } from "@/lib/queries";

export default async function HomePage() {
  const current = getIsoWeekUtc();
  const userId = await getCurrentUserId();
  const weekRange = buildIsoWeekRange(current, 6, 6);
  const weekBoards = await Promise.all(
    weekRange.map(({ year, week }) => getWeekBoard(year, week, userId)),
  );
  const board = weekBoards.find(
    (item) => item.year === current.year && item.week === current.week,
  ) ?? weekBoards[6];
  const featured = board.games.filter((game) => game.featured);
  const carouselGames = featured.length > 0 ? featured : board.games;
  const hasAnyGames = weekBoards.some((item) => item.games.length > 0);

  if (!hasAnyGames) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8">
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>No games this week</EmptyTitle>
            <EmptyDescription>
              The board is empty until the curator assigns titles to this ISO week.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <HomeBoard
      weekBoards={weekBoards}
      currentWeek={current}
      carouselGames={carouselGames}
    />
  );
}
