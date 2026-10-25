"use client";

import { AdRotator } from "@/components/ads/ad-rotator";
import { BrandAdCard } from "@/components/ads/ad-card";
import type { SidebarAd } from "@/lib/ads-types";

export function SidebarAdStack({ ads }: { ads: SidebarAd[] }) {
  const brandAds = ads.filter((ad) => ad.format === "brand" && ad.logoUrl && ad.productName);
  if (brandAds.length === 0) return null;

  return (
    <AdRotator ads={brandAds}>
      {(ad) => <BrandAdCard ad={ad} linked />}
    </AdRotator>
  );
}
