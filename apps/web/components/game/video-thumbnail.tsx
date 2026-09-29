"use client";

import { useEffect, useState } from "react";
import { PlayIcon } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

import { parseVideoEmbed, vimeoOembedUrl, youtubeThumbnailUrl } from "@/lib/urls";
import { cn } from "@/lib/utils";

export function VideoThumbnail({
  url,
  className,
  showPlay = true,
  compact = false,
}: {
  url: string;
  className?: string;
  showPlay?: boolean;
  compact?: boolean;
}) {
  const embed = parseVideoEmbed(url);
  const youtubeSrc =
    embed?.provider === "youtube" ? youtubeThumbnailUrl(embed.id) : null;
  const [vimeoSrc, setVimeoSrc] = useState<string | null>(null);
  const src = youtubeSrc ?? vimeoSrc;

  useEffect(() => {
    const embed = parseVideoEmbed(url);
    if (!embed || embed.provider !== "vimeo") {
      setVimeoSrc(null);
      return;
    }

    let cancelled = false;
    setVimeoSrc(null);
    void fetch(vimeoOembedUrl(embed.watchUrl))
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { thumbnail_url?: string } | null) => {
        if (!cancelled && data?.thumbnail_url) setVimeoSrc(data.thumbnail_url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <span className={cn("relative block size-full overflow-hidden bg-graphite", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className={compact ? "size-3.5 text-fog" : "size-5 text-fog"} />
        </span>
      )}
      {showPlay ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-void/75 text-paper-white",
              compact ? "size-7" : "size-11",
            )}
          >
            <PlayIcon className={cn("fill-current", compact ? "size-3" : "size-4")} />
          </span>
        </span>
      ) : null}
    </span>
  );
}
