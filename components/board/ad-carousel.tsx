"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, MegaphoneIcon } from "lucide-react";

import { CarouselSlide } from "@/components/ads/carousel-slide";
import { isCarouselVideo, type CarouselAd } from "@/lib/ads-types";
import { AD_ROTATE_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AdCarousel({
  ads,
  onIndexChange,
}: {
  ads: CarouselAd[];
  onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeIndex = ads.length === 0 ? 0 : index % ads.length;
  const current = ads[activeIndex];

  const goTo = useCallback(
    (next: number) => {
      if (ads.length === 0) return;
      const wrapped = ((next % ads.length) + ads.length) % ads.length;
      setIndex(wrapped);
      onIndexChange?.(wrapped);
    },
    [ads.length, onIndexChange],
  );

  useEffect(() => {
    function onVisibility() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused || ads.length <= 1) return;
    const id = window.setInterval(() => {
      const next = (activeIndex + 1) % ads.length;
      setIndex(next);
      onIndexChange?.(next);
    }, AD_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [activeIndex, ads.length, onIndexChange, paused]);

  if (!current) {
    return (
      <Link
        href="/adbits?placement=carousel"
        className="group flex aspect-[16/9] min-h-[240px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-iron bg-graphite px-6 text-center transition-colors hover:border-ice-signal sm:min-h-[280px] lg:aspect-[21/9] lg:max-h-[420px]"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-slate text-fog transition-colors group-hover:text-ice-signal">
          <MegaphoneIcon className="size-5" strokeWidth={1.5} />
        </span>
        <span className="text-base font-medium text-paper-white">Your ad here</span>
        <span className="text-sm text-fog">Book a carousel slot this month</span>
      </Link>
    );
  }

  return (
    <div
      className="flex flex-col gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="group relative aspect-[16/9] w-full min-h-[240px] overflow-hidden rounded-2xl sm:min-h-[280px] lg:aspect-[21/9] lg:max-h-[420px]">
        {ads.map((ad, slideIndex) => (
          <a
            key={ad.id}
            href={ad.destinationUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            aria-label={`Advertisement: ${ad.gameName}`}
            tabIndex={slideIndex === activeIndex ? 0 : -1}
            aria-hidden={slideIndex !== activeIndex}
            className={cn(
              "absolute inset-0 outline-none transition-opacity duration-500 focus-visible:ring-2 focus-visible:ring-white/40",
              slideIndex === activeIndex ? "z-10 opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={() => {
              void fetch(`/out/ad/${ad.id}`, { keepalive: true });
            }}
          >
            <CarouselSlide slide={ad} active={slideIndex === activeIndex} />
          </a>
        ))}

        {ads.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute top-1/2 left-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-paper-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/60 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeftIcon className="size-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute top-1/2 right-3 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-paper-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/60 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRightIcon className="size-4" strokeWidth={1.5} />
            </button>
          </>
        ) : null}
      </div>

      {ads.length > 1 ? (
        <div className="flex justify-center gap-2">
          {ads.map((ad, slideIndex) => (
            <button
              key={ad.id}
              type="button"
              aria-label={`Show ${ad.gameName}`}
              aria-current={slideIndex === activeIndex}
              onClick={() => goTo(slideIndex)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                slideIndex === activeIndex ? "w-6 bg-paper-white" : "w-1.5 bg-fog/50",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function carouselBackdropUrl(ad: CarouselAd | undefined) {
  if (!ad || isCarouselVideo(ad.mediaUrl)) return null;
  return ad.mediaUrl;
}
