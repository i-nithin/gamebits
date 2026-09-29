import Link from "next/link";

import { PageHeader, Stat } from "@/components/shell";
import { getOperatorOverview } from "@gamebits/core/overview";
import { formatIsoWeekLabel } from "@gamebits/db/iso-week";

export default async function OverviewPage() {
  const stats = await getOperatorOverview();
  return (
    <>
      <PageHeader
        title="Overview"
        description={formatIsoWeekLabel(stats.year, stats.week)}
        action={
          <Link href="/games/new" className="rounded-lg bg-paper px-3 py-2 text-sm font-medium text-void">
            New game
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Games" value={stats.games} />
        <Stat label="This week" value={`${stats.weekFill}/${stats.weekCap}`} />
        <Stat label="Profiles" value={stats.profiles} />
        <Stat label="Votes" value={stats.votes} />
        <Stat label="Page views" value={stats.pageViews} />
        <Stat label="Link clicks" value={stats.linkClicks} />
      </div>
    </>
  );
}
