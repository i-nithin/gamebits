"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheckIcon, StarIcon } from "lucide-react";

import { IarcBadge } from "@/components/game/iarc-badge";
import { isCarouselVideo } from "@/lib/ads-types";
import { CAROUSEL_BADGE_LABELS, type CarouselBadge, type IarcRating } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type CarouselSlideData = {
  mediaUrl: string;
  tagline: string | null;
  badge: CarouselBadge | null;
  countdownEndsAt: string | null;
  gameName: string;
  developerName: string;
  iarcRating: IarcRating | null;
  reviewAverage: number | null;
  reviewCount: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function CountdownPill({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remain = Math.max(0, new Date(endsAt).getTime() - now);
  const total = Math.floor(remain / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const label = days > 0 ? `${days}d ${clock}` : clock;

  return (
    <span
      suppressHydrationWarning
      className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-paper-white backdrop-blur-sm sm:text-sm"
    >
      {label}
    </span>
  );
}

function RatingStars({ average, count }: { average: number; count: number }) {
  const rounded = Math.round(average);
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`${average.toFixed(1)} out of 5 from ${count} reviews`}
    >
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className="size-3.5 sm:size-4"
            fill={star <= rounded ? "currentColor" : "none"}
            style={{ color: star <= rounded ? "#83c3ff" : undefined }}
          />
        ))}
      </span>
      <span className="text-sm text-paper-white">{average.toFixed(1)}</span>
    </span>
  );
}

export function CarouselSlide({
  slide,
  active = true,
  className,
}: {
  slide: CarouselSlideData;
  active?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = slide.mediaUrl ? isCarouselVideo(slide.mediaUrl) : false;
  const showRating = slide.reviewCount > 0 && slide.reviewAverage != null;

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    if (active) {
      void node.play().catch(() => undefined);
    } else {
      node.pause();
    }
  }, [active]);

  return (
    <div className={cn("absolute inset-0", className)}>
      {slide.mediaUrl ? (
        video ? (
          <video
            ref={videoRef}
            src={slide.mediaUrl}
            muted
            playsInline
            loop
            autoPlay={active}
            className="size-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.mediaUrl} alt="" className="size-full object-cover" />
        )
      ) : (
        <div className="size-full bg-graphite" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/75 from-5% via-black/15 via-40% to-black/25" />
      {slide.countdownEndsAt ? (
        <div className="absolute top-3 left-3 z-10 sm:top-4 sm:left-4">
          <CountdownPill endsAt={slide.countdownEndsAt} />
        </div>
      ) : null}
      {slide.badge ? (
        <div className="absolute top-3 right-3 z-10 sm:top-4 sm:right-4">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-paper-white backdrop-blur-sm sm:text-sm">
            {CAROUSEL_BADGE_LABELS[slide.badge]}
          </span>
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-4 pt-16 pb-4 sm:px-6 sm:pb-5">
        <div className="min-w-0">
          {slide.tagline ? (
            <p className="truncate text-sm text-fog sm:text-base">{slide.tagline}</p>
          ) : null}
          <p className="flex items-center gap-2 text-2xl leading-tight font-medium text-paper-white sm:text-3xl">
            <span className="truncate">{slide.gameName || "Game name"}</span>
            <BadgeCheckIcon className="size-5 shrink-0 fill-ice-strong text-ice-strong sm:size-6" />
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-fog">
            <span className="truncate">By {slide.developerName || "Developer"}</span>
            <BadgeCheckIcon className="size-3.5 shrink-0 text-fog" />
          </p>
          {showRating ? (
            <div className="mt-2">
              <RatingStars average={slide.reviewAverage!} count={slide.reviewCount} />
            </div>
          ) : null}
        </div>
        {slide.iarcRating ? <IarcBadge rating={slide.iarcRating} className="h-12 sm:h-14" /> : null}
      </div>
    </div>
  );
}
