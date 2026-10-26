import Image from "next/image";
import Link from "next/link";

import { GAME_STATUS_LABELS } from "@/lib/constants";
import type { SavedGame } from "@/lib/types";

export function ProfileGameGrid({ games }: { games: SavedGame[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-3 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-4 sm:gap-y-7 xl:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]">
      {games.map((game) => (
        <Link
          key={game.id}
          href={`/games/${game.slug}`}
          className="group -m-2 flex min-w-0 flex-col gap-3 rounded-sm p-2 transition-colors hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-signal focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          <span className="relative aspect-[16/10] overflow-hidden rounded-sm bg-graphite card-ring">
            <Image
              src={game.coverUrl || game.logoUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
              sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 640px) 30vw, 45vw"
            />
            <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
            <span className="absolute top-2 right-2 rounded-full bg-obsidian/75 px-2 py-1 text-[10px] font-medium text-paper-white backdrop-blur-sm">
              {game.archived ? "Archived" : GAME_STATUS_LABELS[game.status]}
            </span>
            <span className="absolute bottom-2 left-2 size-10 overflow-hidden rounded-[10px] border-2 border-page bg-graphite shadow-md">
              <Image src={game.logoUrl} alt="" fill className="object-cover" sizes="40px" />
            </span>
          </span>
          <span className="flex min-w-0 flex-col gap-1 px-0.5">
            <span className="truncate text-sm font-semibold text-paper-white transition-colors group-hover:text-ice-signal">
              {game.name}
            </span>
            <span className="line-clamp-2 text-xs leading-5 text-fog">{game.tagline}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
