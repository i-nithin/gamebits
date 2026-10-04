"use client";

/* GIF animation and blob previews need a plain img element. */
/* eslint-disable @next/next/no-img-element */

import type { SidebarAd } from "@/lib/ads-types";
import { cn } from "@/lib/utils";

type AdVisual = Pick<SidebarAd, "format" | "logoUrl" | "productName" | "tagline" | "mediaUrl">;

export function AdCard({
  ad,
  compact = false,
  className,
}: {
  ad: AdVisual;
  compact?: boolean;
  className?: string;
}) {
  if (ad.format === "media" && ad.mediaUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-graphite",
          compact ? "h-16" : "h-[108px]",
          className,
        )}
      >
        <img src={ad.mediaUrl} alt="" className="size-full object-contain" />
        <span className="absolute top-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] tracking-wide text-white/80 uppercase">
          Ad
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-[#2a2b31]",
        compact ? "flex h-16 items-center gap-3 px-3" : "flex h-[108px] flex-col items-center justify-center gap-1 px-4 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "text-[10px] tracking-wide text-white/40 uppercase",
          compact ? "sr-only" : "absolute top-2 left-2.5",
        )}
      >
        Ad
      </span>
      {ad.logoUrl ? (
        <img
          src={ad.logoUrl}
          alt=""
          className={cn("rounded-lg bg-black/30 object-contain", compact ? "size-10" : "size-9")}
        />
      ) : null}
      <div className={cn("min-w-0", compact ? "flex-1 text-left" : "flex flex-col gap-0.5")}>
        <p className="truncate text-sm font-semibold text-paper-white">{ad.productName}</p>
        <p className={cn("text-xs text-fog", compact ? "truncate" : "line-clamp-2")}>{ad.tagline}</p>
      </div>
    </div>
  );
}

export function AdCardLink({ ad, compact = false }: { ad: SidebarAd; compact?: boolean }) {
  const label =
    ad.format === "brand" && ad.productName
      ? `Advertisement: ${ad.productName}`
      : "Advertisement";
  return (
    <a
      href={ad.destinationUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={label}
      className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      onClick={() => {
        void fetch(`/out/ad/${ad.id}`, { keepalive: true });
      }}
    >
      <AdCard ad={ad} compact={compact} />
    </a>
  );
}
