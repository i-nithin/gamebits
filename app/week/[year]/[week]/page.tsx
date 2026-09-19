import { notFound } from "next/navigation";

import { DiscoverTable } from "@/components/board/discover-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUserId } from "@/lib/auth-admin";
import { formatIsoWeekLabel, parseWeekParams } from "@/lib/iso-week";
import { getWeekBoard } from "@/lib/queries";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ year: string; week: string }>;
}) {
  const { year, week } = await params;
  const parsed = parseWeekParams(year, week);
  if (!parsed) notFound();

  const userId = await getCurrentUserId();
  const board = await getWeekBoard(parsed.year, parsed.week, userId);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-fog uppercase">Weekly board</p>
        <h1 className="text-2xl font-medium sm:text-[32px]">
          {formatIsoWeekLabel(board.year, board.week)}
        </h1>
        <p className="text-sm text-fog">
          {board.live ? "Live" : "Frozen"} · ranked by votes
        </p>
      </div>
      {board.games.length === 0 ? (
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>No listings</EmptyTitle>
            <EmptyDescription>This ISO week has no curated games.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DiscoverTable
          games={board.games}
          year={board.year}
          week={board.week}
          live={board.live}
        />
      )}
    </div>
  );
}
