import Link from "next/link";

import { archiveGameAction } from "@/app/actions/mutations";
import { PageHeader } from "@/components/shell";
import { listAllGames } from "@gamebits/core/queries";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const games = (await listAllGames()).filter((game) =>
    query ? game.name.toLowerCase().includes(query) || game.slug.toLowerCase().includes(query) : true,
  );

  return (
    <>
      <PageHeader
        title="Games"
        description={`${games.length} shown`}
        action={
          <Link href="/games/new" className="rounded-lg bg-paper px-3 py-2 text-sm font-medium text-void">
            New game
          </Link>
        }
      />
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or slug"
          className="w-full max-w-sm rounded-lg border border-white/10 bg-graphite px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg border border-white/10 px-3 py-2 text-sm">
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wide text-fog uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <Link href={`/games/${game.id}`} className="text-ice">
                    {game.name}
                  </Link>
                  <p className="text-xs text-fog">{game.slug}</p>
                </td>
                <td className="px-4 py-3">{game.archivedAt ? "Archived" : game.status}</td>
                <td className="px-4 py-3 font-mono">{game.outboundClicks}</td>
                <td className="px-4 py-3 text-right">
                  <form action={archiveGameAction}>
                    <input type="hidden" name="id" value={game.id} />
                    <input type="hidden" name="archived" value={game.archivedAt ? "false" : "true"} />
                    <button type="submit" className="text-fog hover:text-white">
                      {game.archivedAt ? "Restore" : "Archive"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
