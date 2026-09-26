"use client";

import Image from "next/image";
import { useState } from "react";

import { VideoThumbnail } from "@/components/game/video-thumbnail";
import type { GameMediaItem } from "@/lib/types";
import { parseVideoEmbed, withVideosFirst } from "@/lib/urls";
import { cn } from "@/lib/utils";

export function GameGallery({
  media,
  fallbackUrl,
  trailerUrl,
  name,
}: {
  media: GameMediaItem[];
  fallbackUrl: string;
  trailerUrl?: string | null;
  name: string;
}) {
  const withTrailer =
    trailerUrl &&
    parseVideoEmbed(trailerUrl) &&
    !media.some((item) => item.kind === "video")
      ? [
          { id: "trailer", kind: "video" as const, url: trailerUrl, sortOrder: -1 },
          ...media,
        ]
      : media;
  const items = withVideosFirst(
    withTrailer.length > 0
      ? withTrailer
      : [{ id: "cover", kind: "image" as const, url: fallbackUrl, sortOrder: 0 }],
  );
  const [activeId, setActiveId] = useState(items[0]?.id ?? "cover");
  const active = items.find((item) => item.id === activeId) ?? items[0];
  const embed = active?.kind === "video" ? parseVideoEmbed(active.url) : null;

  return (
    <div className="flex flex-col gap-3 lg:sticky lg:top-20">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-graphite card-ring">
        {active?.kind === "image" ? (
          <Image
            src={active.url}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        ) : embed ? (
          <iframe
            title={`${name} trailer`}
            src={embed.embedUrl}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-fog">
            Media unavailable
          </div>
        )}
      </div>
      {items.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const selected = item.id === active.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-xl card-ring",
                  selected ? "ring-2 ring-ice-signal" : "opacity-80 hover:opacity-100",
                )}
              >
                {item.kind === "image" ? (
                  <Image src={item.url} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <VideoThumbnail url={item.url} compact />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
