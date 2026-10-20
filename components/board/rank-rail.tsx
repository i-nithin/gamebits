import Link from "next/link";
import Image from "next/image";
import { FlameIcon } from "lucide-react";

import { OpenAdSlot } from "@/components/ads/open-ad-slot";
import { SidebarAdStack } from "@/components/ads/sidebar-ad-stack";
import type { SidebarAd } from "@/lib/ads-types";
import type { RankedGame } from "@/lib/types";

export function RankRail({ games, ads }: { games: RankedGame[]; ads: SidebarAd[] }) {
  return (
    <aside className="w-full shrink-0 lg:w-80">
      <div className="lg:sticky lg:top-16 lg:flex lg:max-h-[calc(100vh-6rem)] lg:flex-col">
        <div className="mb-3 hidden lg:block">
          {ads.length > 0 ? <SidebarAdStack ads={ads} /> : <OpenAdSlot />}
        </div>
        <div className="flex min-h-0 flex-col gap-0.5 lg:overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="inline-flex items-center gap-1.5 text-xs tracking-wide text-fog uppercase">
              <FlameIcon className="size-3.5" />
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
            games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className="flex h-12 items-center gap-3 rounded-lg px-2 hover:bg-graphite"
              >
                <Image
                  src={game.logoUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-paper-white">
                  {game.name}
                </span>
                <span className="stat-mono text-sm text-fog">#{game.rank}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
