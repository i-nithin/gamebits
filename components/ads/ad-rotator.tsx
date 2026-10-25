"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { buildAdRotation } from "@/lib/ads-schedule";
import type { SidebarAd } from "@/lib/ads-types";
import { AD_ROTATE_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AdRotator({
  ads,
  children,
}: {
  ads: SidebarAd[];
  children: (ad: SidebarAd) => ReactNode;
}) {
  const rotationKey = ads.map((ad) => `${ad.id}:${ad.weight}`).join("|");
  const playlist = useMemo(() => {
    const seats = rotationKey
      .split("|")
      .filter(Boolean)
      .map((entry) => {
        const splitAt = entry.lastIndexOf(":");
        return {
          id: entry.slice(0, splitAt),
          weight: Number(entry.slice(splitAt + 1)),
        };
      });
    return buildAdRotation(seats);
  }, [rotationKey]);
  const [index, setIndex] = useState(0);
  const rotate = playlist.length > 1;

  useEffect(() => {
    if (!rotate) return;
    let cursor = Math.floor(Math.random() * playlist.length);
    let timer = 0;
    let stopped = false;

    function queue(delay: number) {
      window.clearTimeout(timer);
      if (stopped || document.visibilityState === "hidden") return;
      timer = window.setTimeout(() => {
        setIndex(cursor);
        cursor = (cursor + 1) % playlist.length;
        queue(AD_ROTATE_MS);
      }, delay);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") window.clearTimeout(timer);
      else queue(AD_ROTATE_MS);
    }

    queue(0);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [playlist, rotate]);

  const id = playlist[index] ?? playlist[0];
  const ad = ads.find((item) => item.id === id);
  if (!ad) return null;

  return (
    <div className="overflow-hidden" aria-label="Sponsored">
      <div
        key={`${ad.id}-${index}`}
        className={cn(
          rotate &&
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-300",
        )}
      >
        {children(ad)}
      </div>
    </div>
  );
}
