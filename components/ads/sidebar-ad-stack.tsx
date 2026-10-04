"use client";

import { useEffect, useMemo, useState } from "react";

import { AdCardLink } from "@/components/ads/ad-card";
import { buildDesktopFrames } from "@/lib/ads-schedule";
import type { SidebarAd } from "@/lib/ads-types";
import { AD_ROTATE_MS } from "@/lib/constants";

export function SidebarAdStack({ ads }: { ads: SidebarAd[] }) {
  const frames = useMemo(
    () => buildDesktopFrames(ads.map((ad) => ({ id: ad.id, weight: ad.weight }))),
    [ads],
  );
  const [index, setIndex] = useState(0);
  const rotate = frames.length > 1;

  useEffect(() => {
    if (!rotate) return;
    let cursor = Math.floor(Math.random() * frames.length);
    let timer = 0;
    let stopped = false;

    function queue(delay: number) {
      window.clearTimeout(timer);
      if (stopped || document.visibilityState === "hidden") return;
      timer = window.setTimeout(() => {
        setIndex(cursor);
        cursor = (cursor + 1) % frames.length;
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
  }, [frames, rotate]);

  if (frames.length === 0) return null;
  const frame = frames[index] ?? frames[0];
  const byId = new Map(ads.map((ad) => [ad.id, ad]));

  return (
    <div className="flex flex-col gap-2" aria-label="Sponsored">
      {frame.map((id, position) => {
        const ad = byId.get(id);
        if (!ad) return null;
        return <AdCardLink key={`${id}-${position}`} ad={ad} />;
      })}
    </div>
  );
}
