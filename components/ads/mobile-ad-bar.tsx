"use client";

import { useEffect, useState } from "react";

import { AdRotator } from "@/components/ads/ad-rotator";
import { BrandAdBar } from "@/components/ads/ad-card";
import type { SidebarAd } from "@/lib/ads-types";

export function MobileAdBar({ ads }: { ads: SidebarAd[] }) {
  const brandAds = ads.filter((ad) => ad.format === "brand" && ad.logoUrl && ad.productName);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-app-shell]");
    if (!shell) return;
    const media = window.matchMedia("(max-width: 1023px)");
    function apply() {
      const show = !dismissed && brandAds.length > 0 && media.matches;
      shell!.style.paddingBottom = show ? "calc(5.25rem + env(safe-area-inset-bottom))" : "";
    }
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      shell.style.paddingBottom = "";
    };
  }, [brandAds.length, dismissed]);

  if (dismissed || brandAds.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <AdRotator ads={brandAds}>
        {(ad) => (
          <BrandAdBar
            ad={ad}
            linked
            onDismiss={() => setDismissed(true)}
            className="shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          />
        )}
      </AdRotator>
    </div>
  );
}
