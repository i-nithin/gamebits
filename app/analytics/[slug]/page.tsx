import { notFound } from "next/navigation";

import { AnalyticsBreadcrumbs } from "@/components/analytics/breadcrumbs";
import { AnalyticsCountriesPanel } from "@/components/analytics/countries-panel";
import { AnalyticsDestinationMix } from "@/components/analytics/destination-mix";
import { AnalyticsDiscoveryStrip } from "@/components/analytics/discovery-strip";
import { AnalyticsEngagementPanel } from "@/components/analytics/engagement-panel";
import { AnalyticsGameHeader } from "@/components/analytics/game-header";
import { AnalyticsLaunches } from "@/components/analytics/launches";
import { AnalyticsTrendChart } from "@/components/analytics/trend-chart";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    <TooltipProvider delay={200}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
        <AnalyticsBreadcrumbs
          items={[
            { label: "Analytics", href: analyticsHref },
            { label: data.name },
          ]}
        />
        <AnalyticsGameHeader
          name={data.name}
          logoUrl={data.logoUrl}
          slug={data.slug}
          archived={data.archived}
          range={data.range}
          start={data.start}
          end={data.end}
          periodLabel={data.periodLabel}
          includeLaunch={data.hasLaunchRange}
        />

      <AnalyticsDiscoveryStrip totals={data.totals} deltas={data.deltas} />
      <AnalyticsCountriesPanel countries={data.countries} />
      <AnalyticsEngagementPanel totals={data.totals} deltas={data.deltas} />
      <AnalyticsTrendChart series={data.series} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsDestinationMix clicks={data.clicks} />
        <AnalyticsLaunches launches={data.launches} />
      </div>
      </div>
    </TooltipProvider>
  );
}
