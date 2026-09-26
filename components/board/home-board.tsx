"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CircleIcon } from "lucide-react";

import { GameCardGrid } from "@/components/board/game-card-grid";
import { HeroCarousel } from "@/components/board/hero-carousel";
import { RankRail } from "@/components/board/rank-rail";
import { WeekFilter } from "@/components/board/week-filter";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { compareIsoWeek, type IsoWeek } from "@/lib/iso-week";
import { cn } from "@/lib/utils";
import type { RankedGame, WeekBoard } from "@/lib/types";

export function HomeBoard({
  weekBoards,
  currentWeek,
  carouselGames,
}: {
  weekBoards: WeekBoard[];
  currentWeek: IsoWeek;
  carouselGames: RankedGame[];
}) {
  const weeks = useMemo(
    () => weekBoards.map((board) => ({ year: board.year, week: board.week })),
    [weekBoards],
  );
  const slides = carouselGames.slice(0, 5);
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState<IsoWeek>(currentWeek);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState(() => {
    const currentIndex = weeks.findIndex(
      (week) => week.year === currentWeek.year && week.week === currentWeek.week,
    );
    return Math.max(0, currentIndex - 3);
  });

  function selectWeek(week: IsoWeek) {
    if (compareIsoWeek(week, currentWeek) > 0) return;
    setSelectedWeek(week);
  }

  const currentWeekBoard =
    weekBoards.find(
      (item) => item.year === currentWeek.year && item.week === currentWeek.week,
    ) ?? weekBoards[0];

  const board =
    weekBoards.find(
      (item) => item.year === selectedWeek.year && item.week === selectedWeek.week,
    ) ?? {
      year: selectedWeek.year,
      week: selectedWeek.week,
      live: false,
      games: [],
    };

  const tags = useMemo(() => {
    const unique = new Set<string>();
    for (const game of board.games) {
      for (const tag of game.tags) unique.add(tag);
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [board.games]);
  const activeTag = selectedTag && tags.includes(selectedTag) ? selectedTag : null;
  const launches = activeTag
    ? board.games.filter((game) => game.tags.includes(activeTag))
    : board.games;

  useEffect(() => {
    if (heroIndex >= slides.length) setHeroIndex(0);
  }, [heroIndex, slides.length]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden lg:h-[560px]">
        <div className="relative h-full w-full">
          {slides.map((slide, slideIndex) => (
            <Image
              key={slide.id}
              src={slide.coverUrl}
              alt=""
              fill
              className={
                slideIndex === heroIndex
                  ? "scale-125 object-cover opacity-45 blur-3xl transition-opacity duration-500"
                  : "scale-125 object-cover opacity-0 blur-3xl transition-opacity duration-500"
              }
              sizes="100vw"
            />
          ))}
          <div className="absolute inset-0 bg-linear-to-b from-charcoal/40 via-charcoal/80 to-charcoal" />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-3 pb-8 sm:px-6 lg:flex-row lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <HeroCarousel games={carouselGames} index={heroIndex} onIndexChange={setHeroIndex} />
          <section className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-xl font-medium text-paper-white">Launches</h2>
                <p className="text-sm text-fog">
                  {board.live
                    ? "Games ranked by votes this week"
                    : `Frozen ranking · Week ${selectedWeek.week}, ${selectedWeek.year}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-fog">
                {board.live ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-graphite px-2.5 py-1">
                    <CircleIcon className="size-1.5 fill-success text-success" />
                    Live
                  </span>
                ) : (
                  <span className="rounded-full bg-graphite px-2.5 py-1">Frozen</span>
                )}
              </div>
            </div>
            <WeekFilter
              weeks={weeks}
              selected={selectedWeek}
              current={currentWeek}
              windowStart={windowStart}
              onSelect={selectWeek}
              onWindowStartChange={setWindowStart}
            />
            {tags.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  aria-pressed={activeTag === null}
                  onClick={() => setSelectedTag(null)}
                  className={cn(
                    "h-8 shrink-0 rounded-full border border-iron px-3 text-sm",
                    activeTag === null
                      ? "bg-graphite text-paper-white"
                      : "text-fog hover:bg-slate/50 hover:text-paper-white",
                  )}
                >
                  All
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={activeTag === tag}
                    onClick={() => setSelectedTag(tag)}
                    className={cn(
                      "h-8 shrink-0 rounded-full border border-iron px-3 text-sm",
                      activeTag === tag
                        ? "bg-graphite text-paper-white"
                        : "text-fog hover:bg-slate/50 hover:text-paper-white",
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
            {board.games.length === 0 ? (
              <Empty className="border border-dashed border-iron">
                <EmptyHeader>
                  <EmptyTitle>No launches this week</EmptyTitle>
                  <EmptyDescription>
                    Nothing was assigned to Week {selectedWeek.week}, {selectedWeek.year} yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <GameCardGrid
                games={launches}
                year={board.year}
                week={board.week}
                live={board.live}
              />
            )}
          </section>
        </div>
        <RankRail games={currentWeekBoard?.games ?? []} />
      </div>
    </div>
  );
}
