import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { removeWeekListingAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { weekListings } from "@/db/schema";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { getDb, hasDatabase } from "@/lib/db";
import { formatIsoWeekLabel, getIsoWeekUtc } from "@/lib/iso-week";
import { getWeekBoard, listAllGames } from "@/lib/queries";

export default async function AdminPage() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) {
    redirect("/");
  }

  const current = getIsoWeekUtc();
  const [allGames, board] = await Promise.all([
    listAllGames(),
    getWeekBoard(current.year, current.week, userId),
  ]);

  const listings = hasDatabase()
    ? await getDb()
        .select()
        .from(weekListings)
        .where(
          and(eq(weekListings.isoYear, current.year), eq(weekListings.isoWeek, current.week)),
        )
    : [];

  const listingByGame = new Map(listings.map((row) => [row.gameId, row]));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-medium">Admin</h1>
          <p className="text-sm text-fog">
            {formatIsoWeekLabel(current.year, current.week)} · {board.games.length}/20
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/platforms">
            <Button variant="ghost">Platforms</Button>
          </Link>
          <Link href="/admin/games/new">
            <Button>New game</Button>
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Game</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>This week</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {allGames.map((game) => {
            const listing = listingByGame.get(game.id);
            return (
              <TableRow key={game.id}>
                <TableCell>
                  <Link href={`/admin/games/${game.id}`} className="text-ice-signal">
                    {game.name}
                  </Link>
                  {game.archivedAt ? <span className="ml-2 text-xs text-fog">Archived</span> : null}
                </TableCell>
                <TableCell className="stat-mono">{game.outboundClicks}</TableCell>
                <TableCell>{listing ? (listing.featured ? "Featured" : "Listed") : "—"}</TableCell>
                <TableCell>
                  {listing ? (
                    <form action={removeWeekListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
