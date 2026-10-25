import Link from "next/link";
import Image from "next/image";
import { BadgeCheckIcon, FlameIcon } from "lucide-react";

import { OpenAdSlot } from "@/components/ads/open-ad-slot";
import { SidebarAdStack } from "@/components/ads/sidebar-ad-stack";
import { FacebookMark, InstagramMark, RedditMark, XMark } from "@/components/settings/brand-marks";
import type { SidebarAd } from "@/lib/ads-types";
import { sparklinePolyline } from "@/lib/trending/sparkline";
import type { TrendingRailItem } from "@/lib/trending/queries";

const socialBubble =
  "flex size-8 items-center justify-center rounded-full border border-white/30 text-paper-white";

function TrendSpark({ points }: { points: number[] }) {
  return (
    <svg
      viewBox="0 0 52 22"
      aria-hidden
      className="h-[22px] w-[52px] shrink-0"
    >
      <polyline
        points={sparklinePolyline(points)}
        fill="none"
        stroke="#5cdb7c"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RailSocials() {
  return (
    <div className="flex w-full items-center justify-around">
      <span className={socialBubble} aria-hidden>
        <RedditMark className="size-8" />
      </span>
      <a
        href="https://x.com/gamebitsonline"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GameBits on X"
        className={`${socialBubble} outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
      >
        <XMark className="size-5" />
      </a>
      <span className={socialBubble} aria-hidden>
        <InstagramMark className="size-6" />
      </span>
      <span className={socialBubble} aria-hidden>
        <FacebookMark className="size-7" />
      </span>
    </div>
  );
}

export function RankRail({ games, ads }: { games: TrendingRailItem[]; ads: SidebarAd[] }) {
  return (
    <aside className="w-full shrink-0 lg:w-80">
      <div className="lg:sticky lg:top-16 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col">
        <div className="mb-4 hidden flex-col gap-3 lg:flex">
          <RailSocials />
          <div className="h-px bg-white/15" />
          {ads.length > 0 ? <SidebarAdStack ads={ads} /> : <OpenAdSlot />}
        </div>
        <div className="flex min-h-0 flex-col gap-0.5 lg:overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-3">
            <span className="inline-flex items-center gap-2 text-sm tracking-wide text-fog uppercase">
              <FlameIcon className="size-4" />
              Trending
            </span>
            <Link
              href="/collections?view=trending&range=today"
              className="text-xs text-fog hover:text-paper-white"
            >
              See all
            </Link>
          </div>
          {games.length === 0 ? (
            <p className="px-2 py-2 text-sm text-fog">No games yet</p>
          ) : (
            games.map(({ game, points }) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="flex min-h-16 items-center gap-2.5 rounded-sm px-2 transition-colors hover:bg-[#1c1c1c] focus-visible:bg-[#1c1c1c] focus-visible:outline-none"
              >
                <Image
                  src={game.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-sm object-cover"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-paper-white">{game.name}</span>
                  {game.developerName ? (
                    <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-fog">
                      <span className="truncate">{game.developerName}</span>
                      <BadgeCheckIcon className="size-3 shrink-0 fill-ice-strong text-paper-white" />
                    </span>
                  ) : null}
                </span>
                <TrendSpark points={points} />
              </Link>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
