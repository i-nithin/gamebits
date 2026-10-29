"use client";

/* Remote logos and GIF thumbnails in the account list need a plain img element. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowUpRightIcon, XIcon } from "lucide-react";

import { isCarouselVideo, type SidebarAd } from "@/lib/ads-types";
import { cn } from "@/lib/utils";

type AdVisual = Pick<SidebarAd, "format" | "logoUrl" | "productName" | "tagline" | "mediaUrl">;

type BrandFields = {
  id?: string;
  logoUrl: string | null;
  productName: string | null;
  tagline: string | null;
  destinationUrl?: string;
};

const railCard = "bg-obsidian text-paper-white";
const railMuted = "text-[#a3a3a3]";
const railVisitClass =
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-white/20 bg-[#3c3c3c] px-3 text-sm font-medium text-white";

function AdLogo({ src, className }: { src: string | null; className?: string }) {
  if (!src) {
    return <span className={cn("block bg-white/10", className)} />;
  }
  return <img src={src} alt="" className={cn("object-cover", className)} />;
}

function VisitControl({
  ad,
  linked,
}: {
  ad: BrandFields;
  linked: boolean;
}) {
  const label = ad.productName ? `Visit ${ad.productName}` : "Visit";
  const icon = <ArrowUpRightIcon className="size-3.5" />;
  if (!linked || !ad.destinationUrl || !ad.id) {
    return (
      <span className={railVisitClass}>
        Visit
        {icon}
      </span>
    );
  }
  return (
    <a
      href={`/out/ad/${ad.id}`}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={label}
      className={cn(railVisitClass, "outline-none focus-visible:ring-2 focus-visible:ring-white/40")}
    >
      Visit
      {icon}
    </a>
  );
}

export function BrandAdCard({
  ad,
  linked = false,
  className,
}: {
  ad: BrandFields;
  linked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-white/10 p-4", railCard, className)}>
      <div className="flex items-start justify-between gap-3">
        <AdLogo src={ad.logoUrl} className="size-14 rounded-md bg-white/10" />
        <VisitControl ad={ad} linked={linked} />
      </div>
      <p className="mt-4 truncate text-lg font-semibold">{ad.productName}</p>
      <p className={cn("mt-1 line-clamp-2 text-base leading-6", railMuted)}>{ad.tagline}</p>
      <div className="my-3 h-px bg-white/15" />
      <div className={cn("flex items-center justify-between gap-3 text-sm", railMuted)}>
        <Link
          href="/adbits"
          className="inline-flex items-center gap-1 outline-none hover:text-paper-white focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Advertise
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
        <span>Promoted</span>
      </div>
    </div>
  );
}

export function BrandAdBar({
  ad,
  linked = false,
  onDismiss,
  className,
}: {
  ad: BrandFields;
  linked?: boolean;
  onDismiss?: () => void;
  className?: string;
}) {
  const label = ad.productName ? `Visit ${ad.productName}` : "Visit";
  const linkedVisit = linked && ad.destinationUrl && ad.id ? ad.id : null;
  const face = (
    <>
      <AdLogo src={ad.logoUrl} className="size-10 rounded-sm bg-white/10" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <span className="truncate">{ad.productName}</span>
          <span className={cn("shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide", railMuted)}>
            AD
          </span>
        </p>
        <p className={cn("truncate text-xs", railMuted)}>{ad.tagline}</p>
      </div>
      <span className={railVisitClass}>
        Visit
        <ArrowUpRightIcon className="size-3.5" />
      </span>
    </>
  );

  return (
    <div className={cn("flex items-center gap-1 rounded-2xl p-2", railCard, className)}>
      {linkedVisit ? (
        <a
          href={`/out/ad/${linkedVisit}`}
          target="_blank"
          rel="sponsored noopener noreferrer"
          aria-label={label}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {face}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1 py-0.5">{face}</div>
      )}
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss ad"
          onClick={onDismiss}
          className={cn(
            "mr-1 flex size-8 shrink-0 items-center justify-center rounded-full outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40",
            railMuted,
          )}
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

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
        {isCarouselVideo(ad.mediaUrl) ? (
          <video src={ad.mediaUrl} muted playsInline className="size-full object-cover" />
        ) : (
          <img src={ad.mediaUrl} alt="" className="size-full object-contain" />
        )}
        <span className="absolute top-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] tracking-wide text-white/80 uppercase">
          Ad
        </span>
      </div>
    );
  }

  if (compact) {
    return <BrandAdBar ad={ad} className={className} />;
  }

  return <BrandAdCard ad={ad} className={className} />;
}
