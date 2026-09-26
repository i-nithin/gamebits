import Link from "next/link";
import Image from "next/image";
import { BadgeCheckIcon } from "lucide-react";

import type { RankedGame } from "@/lib/types";

export function RankRail({ games }: { games: RankedGame[] }) {
  return (
    <aside className="w-full shrink-0 lg:w-80">
      <div className="flex flex-col gap-0.5 lg:sticky lg:top-16 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-2 text-xs tracking-wide text-fog uppercase">
          <span>Game</span>
          <span>Votes</span>
        </div>
        {games.map((game) => (
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
              className="size-8 rounded-full bg-graphite object-contain p-0.5"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-paper-white">
              {game.name}
            </span>
            <BadgeCheckIcon className="size-3.5 shrink-0 text-ice-strong" />
            <span className="stat-mono text-sm text-paper-white">{game.voteCount}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
