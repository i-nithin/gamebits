import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AnalyticsBreadcrumbs } from "@/components/analytics/breadcrumbs";
import { AnalyticsCountriesPanel } from "@/components/analytics/countries-panel";
import { AnalyticsDateRangeControl } from "@/components/analytics/date-range-control";
import { AnalyticsDestinationMix } from "@/components/analytics/destination-mix";
import { AnalyticsDiscoveryStrip } from "@/components/analytics/discovery-strip";
import { AnalyticsEngagementPanel } from "@/components/analytics/engagement-panel";
import { AnalyticsLaunches } from "@/components/analytics/launches";
import { AnalyticsTrendChart } from "@/components/analytics/trend-chart";
import { Badge } from "@/components/ui/badge";
import { getGameAnalytics } from "@/lib/analytics/queries";
import { analyticsQueryHref } from "@/lib/analytics/range";
import { getCurrentUserId } from "@/lib/auth-admin";

export const metadata = {
  title: "Analytics · GameBits",
};

export default async function GameAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const [{ slug }, query, userId] = await Promise.all([
    params,
    searchParams,
    getCurrentUserId(),
  ]);
  if (!userId) notFound();

  const data = await getGameAnalytics(userId, slug, {
    range: query.range,
    from: query.from,
    to: query.to,
  });
  if (!data) notFound();

  const analyticsHref = analyticsQueryHref("/analytics", {
    key: data.range,
    start: data.start,
    end: data.end,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4">
        <AnalyticsBreadcrumbs
          items={[
            { label: "Studio" },
            { label: "Analytics", href: analyticsHref },
            { label: data.name },
          ]}
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
          <Suspense fallback={null}>
            <AnalyticsDateRangeControl
              value={data.range}
              start={data.start}
              end={data.end}
              periodLabel={data.periodLabel}
              includeLaunch={data.hasLaunchRange}
            />
          </Suspense>
        </div>
      </div>

      <AnalyticsDiscoveryStrip totals={data.totals} deltas={data.deltas} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsEngagementPanel totals={data.totals} deltas={data.deltas} />
        <AnalyticsCountriesPanel countries={data.countries} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[11px] tracking-[0.08em] text-fog uppercase">
          Views and link clicks over time
        </h2>
        <div className="rounded-2xl bg-obsidian p-4 sm:p-5 card-ring">
          <AnalyticsTrendChart series={data.series} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsDestinationMix clicks={data.clicks} />
        <AnalyticsLaunches launches={data.launches} />
      </div>
    </div>
  );
}
