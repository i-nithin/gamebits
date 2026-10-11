"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowUpRightIcon } from "lucide-react";

import { AnalyticsDateRangeControl } from "@/components/analytics/date-range-control";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsRangeKey } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const STICK_TOP = 68;

export function AnalyticsGameHeader({
  name,
  logoUrl,
  slug,
  archived,
  range,
  start,
  end,
  periodLabel,
  includeLaunch,
}: {
  name: string;
  logoUrl: string;
  slug: string;
  archived: boolean;
  range: AnalyticsRangeKey;
  start: string | null;
  end: string | null;
  periodLabel: string;
  includeLaunch: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = barRef.current;
    if (!node) return;

    function update() {
      if (!node) return;
      setStuck(node.getBoundingClientRect().top <= STICK_TOP + 1);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={barRef} className="sticky top-[4.25rem] z-20 -mt-6">
      <div
        className={cn(
          "flex flex-row flex-wrap items-center justify-between gap-x-6 gap-y-3 transition-[background-color,box-shadow,border-radius] duration-200",
          stuck
            ? "rounded-full bg-charcoal/80 px-4 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
            : "px-1 py-1",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl sm:size-12">
            <Image src={logoUrl} alt="" fill className="object-cover" sizes="48px" />
          </span>
          <div className={cn("flex min-w-0 items-center gap-2", stuck && "sr-only")}>
            <h1 className="min-w-0 truncate text-lg font-medium sm:text-2xl">{name}</h1>
            {archived ? <Badge variant="outline">Archived</Badge> : null}
            <Link
              href={`/games/${slug}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs text-fog transition-colors hover:bg-graphite hover:text-paper-white"
            >
              View game
              <ArrowUpRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>
        <div className="min-w-0 shrink-0">
          <Suspense fallback={null}>
            <AnalyticsDateRangeControl
              value={range}
              start={start}
              end={end}
              periodLabel={periodLabel}
              includeLaunch={includeLaunch}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
