import Link from "next/link";
import { Suspense } from "react";

import { OpenAuthButton } from "@/components/shell/open-auth-button";

import { AnalyticsBreadcrumbs } from "@/components/analytics/breadcrumbs";
import { AnalyticsCountriesPanel } from "@/components/analytics/countries-panel";
import { AnalyticsDateRangeControl } from "@/components/analytics/date-range-control";
import { AnalyticsDiscoveryStrip } from "@/components/analytics/discovery-strip";
import { AnalyticsEngagementPanel } from "@/components/analytics/engagement-panel";
import { AnalyticsGameList } from "@/components/analytics/game-list";
import { AnalyticsTrendChart } from "@/components/analytics/trend-chart";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getAnalyticsPortfolio } from "@/lib/analytics/queries";
import { ANALYTICS_PAGE_SUBTITLE } from "@/lib/analytics/metric-copy";
import { analyticsQueryString } from "@/lib/analytics/range";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";

export const metadata = {
  title: "Game Analytics",
  description: "Track game views, engagement, launch activity, and audience trends.",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const [params, userId] = await Promise.all([searchParams, getCurrentUserId()]);

  if (!userId) {
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
        <AnalyticsHeader />
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Sign in to see analytics</EmptyTitle>
            <EmptyDescription>
              Views, link clicks, and how people engage with the games you add.
            </EmptyDescription>
          </EmptyHeader>
          {clerkEnabled ? (
            <OpenAuthButton className="rounded-full">Sign in</OpenAuthButton>
          ) : null}
        </Empty>
      </div>
    );
  }

  const portfolio = await getAnalyticsPortfolio(userId, {
    range: params.range,
    from: params.from,
    to: params.to,
  });
  if (!portfolio) {
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
        <AnalyticsHeader />
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Analytics are unavailable</EmptyTitle>
            <EmptyDescription>Try again once the database is connected.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <TooltipProvider delay={200}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4">
        <AnalyticsBreadcrumbs items={[{ label: "Analytics" }]} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <AnalyticsHeader />
          <Suspense fallback={null}>
            <AnalyticsDateRangeControl
              value={portfolio.range}
              start={portfolio.start}
              end={portfolio.end}
              periodLabel={portfolio.periodLabel}
            />
          </Suspense>
        </div>
      </div>

      <AnalyticsDiscoveryStrip totals={portfolio.totals} deltas={portfolio.deltas} />
      <AnalyticsCountriesPanel countries={portfolio.countries} />
      <AnalyticsEngagementPanel totals={portfolio.totals} deltas={portfolio.deltas} />
      <AnalyticsTrendChart series={portfolio.series} />

      {portfolio.games.length === 0 ? (
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>No games yet</EmptyTitle>
            <EmptyDescription>Add a game to start collecting views and clicks.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" className="rounded-full" render={<Link href="/games/new" />}>
            Add game
          </Button>
        </Empty>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-lg font-medium">
            Games
            <span className="stat-mono ml-2 text-sm font-normal text-fog">{portfolio.gameCount}</span>
          </h2>
          <AnalyticsGameList
            games={portfolio.games}
            query={analyticsQueryString({
              key: portfolio.range,
              start: portfolio.start,
              end: portfolio.end,
            })}
          />
        </section>
      )}
      </div>
    </TooltipProvider>
  );
}

function AnalyticsHeader() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-medium sm:text-[32px]">Analytics</h1>
      <p className="max-w-xl text-sm leading-6 text-fog">{ANALYTICS_PAGE_SUBTITLE}</p>
    </div>
  );
}
