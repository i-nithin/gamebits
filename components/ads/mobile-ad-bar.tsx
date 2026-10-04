"use client";

import { useEffect, useMemo, useState } from "react";

import { AdCardLink } from "@/components/ads/ad-card";
import { buildMobileStays } from "@/lib/ads-schedule";
import type { SidebarAd } from "@/lib/ads-types";
import { AD_ROTATE_MS } from "@/lib/constants";

export function MobileAdBar({ ads }: { ads: SidebarAd[] }) {
  const stays = useMemo(
    () => buildMobileStays(ads.map((ad) => ({ id: ad.id, weight: ad.weight }))),
    [ads],
  );
  const [index, setIndex] = useState(0);
  const rotate = stays.length > 1;

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-app-shell]");
    if (!shell) return;
    const media = window.matchMedia("(max-width: 1023px)");
    function apply() {
      shell!.style.paddingBottom = media.matches
        ? "calc(5.25rem + env(safe-area-inset-bottom))"
        : "";
    }
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      shell.style.paddingBottom = "";
    };
  }, []);

  useEffect(() => {
    if (!rotate) return;
    let cursor = Math.floor(Math.random() * stays.length);
    let timer = 0;
    let stopped = false;

    function show(delay: number) {
      window.clearTimeout(timer);
      if (stopped || document.visibilityState === "hidden") return;
      timer = window.setTimeout(() => {
        setIndex(cursor);
        const ticks = (stays[cursor] ?? stays[0]).ticks;
        cursor = (cursor + 1) % stays.length;
        show(ticks * AD_ROTATE_MS);
      }, delay);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") window.clearTimeout(timer);
      else {
        const shown = (cursor - 1 + stays.length) % stays.length;
        show((stays[shown] ?? stays[0]).ticks * AD_ROTATE_MS);
      }
    }

    show(0);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rotate, stays]);

  const stay = stays[index] ?? stays[0];
  const ad = ads.find((item) => item.id === stay?.id);
  if (!ad) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-obsidian/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <AdCardLink ad={ad} compact />
    </div>
  );
}
