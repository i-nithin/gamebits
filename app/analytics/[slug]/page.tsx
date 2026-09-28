import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsClicks, AnalyticsLaunches } from "@/components/analytics/game-breakdown";
import { analyticsPrimaryStats, analyticsSecondaryStats } from "@/components/analytics/stat-items";
import { AnalyticsSummary } from "@/components/analytics/stat-grid";
import { Badge } from "@/components/ui/badge";
import { getGameAnalytics } from "@/lib/analytics/queries";
import { getCurrentUserId } from "@/lib/auth-admin";

export const metadata = {
  title: "Analytics · GameBits",
};

export default async function GameAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, userId] = await Promise.all([params, getCurrentUserId()]);
  if (!userId) notFound();

  const data = await getGameAnalytics(userId, slug);
  if (!data) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4">
        <Link href="/analytics" className="w-fit text-sm text-fog hover:text-paper-white">
          Analytics
        </Link>
        <div className="flex items-center gap-3">
          <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-graphite card-ring">
            <Image src={data.coverUrl} alt="" fill className="object-cover" sizes="56px" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 max-w-full truncate text-2xl font-medium sm:text-[32px]">
                {data.name}
              </h1>
              {data.archived ? <Badge variant="outline">Archived</Badge> : null}
              <Link href={`/games/${data.slug}`} className="text-sm text-fog hover:text-paper-white">
                View game
              </Link>
            </div>
          </div>
        </div>
      </div>

      <AnalyticsSummary
        primary={analyticsPrimaryStats(data.totals)}
        secondary={analyticsSecondaryStats(data.totals)}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Launches</h2>
        <AnalyticsLaunches launches={data.launches} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Link clicks</h2>
        <AnalyticsClicks clicks={data.clicks} />
      </section>
    </div>
  );
}
