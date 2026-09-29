import Link from "next/link";

import { Forbidden, PageHeader, Stat } from "@/components/shell";
import { getCurrentUserId, hasMinRole } from "@gamebits/auth";
import { getAnalyticsPortfolio } from "@gamebits/core/analytics/queries";

export default async function AnalyticsPage() {
  const userId = await getCurrentUserId();
  if (!userId || !(await hasMinRole(userId, "admin"))) {
    return <Forbidden need="admins and owners" />;
  }
  const portfolio = await getAnalyticsPortfolio(userId, { range: "30d" });
  const totals = portfolio?.totals;

  return (
    <>
      <PageHeader title="Analytics" description={portfolio?.periodLabel ?? "Last 30 days"} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Views" value={totals?.pageViews ?? 0} />
        <Stat label="Link clicks" value={totals?.linkClicks ?? 0} />
        <Stat label="Upvotes" value={totals?.upvotes ?? 0} />
        <Stat label="Games" value={portfolio?.gameCount ?? 0} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wide text-fog uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">Upvotes</th>
            </tr>
          </thead>
          <tbody>
            {(portfolio?.games ?? []).map((game) => (
              <tr key={game.id} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <Link href={`/games/${game.id}`} className="text-ice">
                    {game.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">{game.pageViews}</td>
                <td className="px-4 py-3 font-mono">{game.linkClicks}</td>
                <td className="px-4 py-3 font-mono">{game.upvotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
