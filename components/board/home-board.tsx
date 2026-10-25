"use client";

import { useState } from "react";
import Image from "next/image";
import { CircleIcon } from "lucide-react";

import { MobileAdBar } from "@/components/ads/mobile-ad-bar";
import { OpenAdSlot } from "@/components/ads/open-ad-slot";
import { AdCarousel } from "@/components/board/ad-carousel";
import { GameCardGrid } from "@/components/board/game-card-grid";
import { RankRail } from "@/components/board/rank-rail";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { isCarouselVideo, type CarouselAd, type SidebarAd } from "@/lib/ads-types";
import type { RankedGame, WeekBoard } from "@/lib/types";

export function HomeBoard({
  board,
  ads,
  carouselAds,
  trending,
}: {
  board: WeekBoard;
  ads: SidebarAd[];
  carouselAds: CarouselAd[];
  trending: RankedGame[];
}) {
  const [heroIndex, setHeroIndex] = useState(0);

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
          <div className="absolute inset-0 bg-linear-to-b from-page/40 via-page/80 to-page" />
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
                    : `Frozen ranking · Week ${board.week}, ${board.year}`}
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
            {board.games.length === 0 ? (
              <Empty className="border border-dashed border-iron">
                <EmptyHeader>
                  <EmptyTitle>No launches this week</EmptyTitle>
                  <EmptyDescription>
                    Nothing was assigned to Week {board.week}, {board.year} yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <GameCardGrid
                games={board.games}
                year={board.year}
                week={board.week}
                live={board.live}
              />
            )}
          </section>
        </div>
        <RankRail games={trending} ads={ads} />
      </div>
      {ads.length > 0 ? <MobileAdBar ads={ads} /> : null}
    </div>
  );
}
