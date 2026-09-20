"use client";

import { useEffect, useState } from "react";
import { PlayIcon } from "lucide-react";

import { parseVideoEmbed } from "@/lib/urls";
import { cn } from "@/lib/utils";

export function VideoThumbnail({
  url,
  compact = false,
  className,
}: {
  url: string;
  compact?: boolean;
  className?: string;
}) {
  const parsed = parseVideoEmbed(url);
  const [poster, setPoster] = useState<string | null>(
    parsed?.provider === "youtube" ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg` : null,
  );

  useEffect(() => {
    if (!parsed || parsed.provider !== "vimeo") return;
    const controller = new AbortController();
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(parsed.watchUrl)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { thumbnail_url?: string } | null) => {
        if (data?.thumbnail_url) setPoster(data.thumbnail_url);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [parsed]);

  return (
    <span className={cn("relative block size-full overflow-hidden bg-graphite", className)}>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="size-full object-cover" />
      ) : (
        <span className="size-full bg-graphite" />
      )}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-void/35",
          compact && "bg-void/20",
        )}
      >
        <PlayIcon
          className={cn("text-paper-white", compact ? "size-4" : "size-10")}
          fill="currentColor"
          strokeWidth={0}
        />
      </span>
    </span>
  );
}
