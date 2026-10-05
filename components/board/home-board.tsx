"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CircleIcon } from "lucide-react";

import { MobileAdBar } from "@/components/ads/mobile-ad-bar";
import { OpenAdSlot } from "@/components/ads/open-ad-slot";
import { AdCarousel } from "@/components/board/ad-carousel";
import { GameCardGrid } from "@/components/board/game-card-grid";
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
import { isCarouselVideo, type CarouselAd, type SidebarAd } from "@/lib/ads-types";
import type { WeekBoard } from "@/lib/types";

export function HomeBoard({
  weekBoards,
  currentWeek,
  ads,
  carouselAds,
}: {
  weekBoards: WeekBoard[];
  currentWeek: IsoWeek;
  ads: SidebarAd[];
  carouselAds: CarouselAd[];
}) {
  const weeks = useMemo(
    () => weekBoards.map((board) => ({ year: board.year, week: board.week })),
    [weekBoards],
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState<IsoWeek>(currentWeek);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    for (const game of board.games) {
      for (const category of game.categories) unique.set(category.slug, category.name);
    }
    return [...unique.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [board.games]);
  const activeCategory =
    selectedCategory && categories.some((category) => category.slug === selectedCategory)
      ? selectedCategory
      : null;
  const launches = activeCategory
    ? board.games.filter((game) =>
        game.categories.some((category) => category.slug === activeCategory),
      )
    : board.games;

  const backdropIndex =
    carouselAds.length === 0 ? 0 : Math.min(heroIndex, carouselAds.length - 1);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden lg:h-[560px]">
        <div className="relative h-full w-full">
          {carouselAds.map((slide, slideIndex) =>
            isCarouselVideo(slide.mediaUrl) ? null : (
              <Image
                key={slide.id}
                src={slide.mediaUrl}
                alt=""
                fill
                className={
                  slideIndex === backdropIndex
                    ? "scale-125 object-cover opacity-45 blur-3xl transition-opacity duration-500"
                    : "scale-125 object-cover opacity-0 blur-3xl transition-opacity duration-500"
                }
                sizes="100vw"
              />
            ),
          )}
          <div className="absolute inset-0 bg-linear-to-b from-charcoal/40 via-charcoal/80 to-charcoal" />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-3 pb-8 sm:px-6 lg:flex-row lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <AdCarousel ads={carouselAds} onIndexChange={setHeroIndex} />
          {ads.length === 0 ? (
            <div className="lg:hidden">
              <OpenAdSlot />
            </div>
          ) : null}
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
            {categories.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  aria-pressed={activeCategory === null}
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "h-8 shrink-0 rounded-full border border-iron px-3 text-sm",
                    activeCategory === null
                      ? "bg-graphite text-paper-white"
                      : "text-fog hover:bg-slate/50 hover:text-paper-white",
                  )}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    aria-pressed={activeCategory === category.slug}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={cn(
                      "h-8 shrink-0 rounded-full border border-iron px-3 text-sm",
                      activeCategory === category.slug
                        ? "bg-graphite text-paper-white"
                        : "text-fog hover:bg-slate/50 hover:text-paper-white",
                    )}
                  >
                    {category.name}
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
        <RankRail games={currentWeekBoard?.games ?? []} ads={ads} />
      </div>
      {ads.length > 0 ? <MobileAdBar ads={ads} /> : null}
    </div>
  );
}
