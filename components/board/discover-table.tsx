import Image from "next/image";
import Link from "next/link";
import { BadgeCheckIcon, StarIcon } from "lucide-react";

import { VoteButton } from "@/components/game/vote-button";
import { PlatformChipList } from "@/components/game/platform-chip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GAME_STATUS_LABELS } from "@/lib/constants";
import type { RankedGame } from "@/lib/types";

export function DiscoverTable({
  games,
  year,
  week,
  live,
}: {
  games: RankedGame[];
  year: number;
  week: number;
  live: boolean;
}) {
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Game</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Platforms</TableHead>
          <TableHead className="text-right">Votes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((game) => (
          <TableRow key={game.id} className="hover:bg-graphite">
            <TableCell>
              <StarIcon className="size-4 text-fog" />
            </TableCell>
            <TableCell>
              <Link href={`/games/${game.slug}`} className="flex items-center gap-3">
                <Image
                  src={game.coverUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 rounded-full object-cover"
                />
                <span className="stat-mono w-6 text-fog">{game.rank}</span>
                <span className="font-medium">{game.name}</span>
                <BadgeCheckIcon className="size-3.5 text-ice-strong" />
                {game.featured ? (
                  <Badge className="rounded-lg bg-ice-soft text-[10px] text-ice-signal">
                    NEW
                  </Badge>
                ) : null}
              </Link>
            </TableCell>
            <TableCell className="text-fog">{GAME_STATUS_LABELS[game.status]}</TableCell>
            <TableCell>
              <PlatformChipList platforms={game.platforms} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <VoteButton
                  gameId={game.id}
                  year={year}
                  week={week}
                  voteCount={game.voteCount}
                  voted={game.voted}
                  live={live}
                  compact
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
