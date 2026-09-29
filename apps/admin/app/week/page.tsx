import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { assignWeekAction, removeWeekAction } from "@/app/actions/mutations";
import { PageHeader } from "@/components/shell";
import { getDb, hasDatabase } from "@gamebits/db";
import { weekListings } from "@gamebits/db/schema";
import { formatIsoWeekLabel, getIsoWeekUtc } from "@gamebits/db/iso-week";
import { listAllGames } from "@gamebits/core/queries";

export default async function WeekPage() {
  const current = getIsoWeekUtc();
  const games = await listAllGames();
  const listings = hasDatabase()
    ? await getDb()
        .select()
        .from(weekListings)
        .where(and(eq(weekListings.isoYear, current.year), eq(weekListings.isoWeek, current.week)))
    : [];
  const listingByGame = new Map(listings.map((row) => [row.gameId, row]));

  return (
    <>
      <PageHeader
        title="This week"
        description={`${formatIsoWeekLabel(current.year, current.week)} · ${listings.length}/20`}
      />
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wide text-fog uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">Board</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const listing = listingByGame.get(game.id);
              return (
                <tr key={game.id} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/games/${game.id}`} className="text-ice">
                      {game.name}
                    </Link>
                    {game.archivedAt ? <span className="ml-2 text-xs text-fog">Archived</span> : null}
                  </td>
                  <td className="px-4 py-3 font-mono">{game.outboundClicks}</td>
                  <td className="px-4 py-3">{listing ? (listing.featured ? "Featured" : "Listed") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {listing ? (
                      <form action={removeWeekAction}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button type="submit" className="text-fog hover:text-white">
                          Remove
                        </button>
                      </form>
                    ) : (
                      <form action={assignWeekAction} className="flex items-center justify-end gap-2">
                        <input type="hidden" name="gameId" value={game.id} />
                        <input type="hidden" name="year" value={current.year} />
                        <input type="hidden" name="week" value={current.week} />
                        <label className="flex items-center gap-1 text-xs text-fog">
                          <input type="checkbox" name="featured" />
                          Featured
                        </label>
                        <button type="submit" className="text-ice">
                          Assign
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
