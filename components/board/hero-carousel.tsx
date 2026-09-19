"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { GAME_STATUS_LABELS } from "@/lib/constants";
import type { RankedGame } from "@/lib/types";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 6000;

export function HeroCarousel({
  games,
  index,
  onIndexChange,
}: {
  games: RankedGame[];
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const slides = games.slice(0, 5);
  const [paused, setPaused] = useState(false);
  const current = slides[index] ?? slides[0];

  const goTo = useCallback(
    (next: number) => {
      if (slides.length === 0) return;
      onIndexChange(((next % slides.length) + slides.length) % slides.length);
    },
    [onIndexChange, slides.length],
  );

  useEffect(() => {
    if (paused || slides.length <= 1) return;

    const id = window.setInterval(() => {
      onIndexChange((index + 1) % slides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(id);
  }, [paused, slides.length, index, onIndexChange]);

  if (!current) return null;

  const stats = [
    { label: "Status", value: GAME_STATUS_LABELS[current.status] },
    { label: "Platforms", value: current.platforms.join(", ") },
    { label: "Votes", value: String(current.voteCount), mono: true },
    { label: "Rank", value: `#${current.rank}`, mono: true },
  ];

  const previews = slides.filter((slide) => slide.id !== current.id).slice(0, 3);

  return (
    <div
      className="flex flex-col gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="group relative aspect-[16/9] w-full min-h-[240px] overflow-hidden rounded-2xl sm:min-h-[280px] lg:aspect-[21/9] lg:max-h-[420px]">
        {slides.map((slide, slideIndex) => (
          <Image
            key={slide.id}
            src={slide.coverUrl}
            alt=""
            fill
            className={cn(
              "object-cover transition-opacity duration-500",
              slideIndex === index ? "opacity-100" : "opacity-0",
            )}
            sizes="(max-width: 1200px) 100vw, 880px"
            priority={slideIndex === 0}
          />
        ))}

        <div className="absolute inset-0 bg-linear-to-t from-black/70 from-5% via-transparent via-45% to-transparent" />

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(index - 1)}
              className="absolute top-1/2 left-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-paper-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/60 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeftIcon className="size-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(index + 1)}
              className="absolute top-1/2 right-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-paper-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/60 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRightIcon className="size-4" strokeWidth={1.5} />
            </button>
          </>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-5 pt-16 sm:px-8 sm:pb-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <Link
                href={`/games/${current.slug}`}
                className="flex items-center gap-2 text-[28px] leading-tight font-medium text-paper-white sm:text-[32px]"
              >
                <span className="truncate">{current.name}</span>
                <BadgeCheckIcon className="size-5 shrink-0 fill-ice-strong text-ice-strong" />
              </Link>
              <p className="flex items-center gap-1.5 text-sm text-fog">
                By {current.developerName}
                <BadgeCheckIcon className="size-3.5 text-fog" />
              </p>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="inline-flex max-w-full divide-x divide-white/10 overflow-x-auto rounded-xl bg-black/45 backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1 px-4 py-3 sm:px-5 sm:py-3.5">
                    <span className="text-[11px] tracking-wide text-fog uppercase">{stat.label}</span>
                    <span
                      className={cn(
                        "whitespace-nowrap text-base text-paper-white",
                        stat.mono && "stat-mono",
                      )}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              {previews.length > 0 ? (
                <div className="hidden shrink-0 gap-2 sm:flex">
                  {previews.map((slide) => {
                    const slideIndex = slides.findIndex((item) => item.id === slide.id);
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={`Show ${slide.name}`}
                        onClick={() => goTo(slideIndex)}
                        className="relative size-[72px] overflow-hidden rounded-xl border border-white/15 transition-opacity hover:opacity-90"
                      >
                        <Image
                          src={slide.coverUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="72px"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="flex justify-center gap-2">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show ${slide.name}`}
              onClick={() => goTo(slideIndex)}
              className={cn(
                "h-1 rounded-full transition-all",
                slideIndex === index ? "w-8 bg-paper-white" : "w-6 bg-iron",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
