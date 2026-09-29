import Link from "next/link";
import { Suspense } from "react";
import { SignInButton } from "@clerk/nextjs";

import { AnalyticsBreadcrumbs } from "@/components/analytics/breadcrumbs";
import { AnalyticsCountriesPanel } from "@/components/analytics/countries-panel";
import { AnalyticsDateRangeControl } from "@/components/analytics/date-range-control";
import { AnalyticsDiscoveryStrip } from "@/components/analytics/discovery-strip";
import { AnalyticsEngagementPanel } from "@/components/analytics/engagement-panel";
import { AnalyticsGameList } from "@/components/analytics/game-list";
import { AnalyticsTrendChart } from "@/components/analytics/trend-chart";
import { Button } from "@/components/ui/button";
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
  title: "Analytics · GameBits",
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
            <SignInButton mode="modal">
              <Button variant="outline" className="rounded-full">
                Sign in
              </Button>
            </SignInButton>
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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4">
        <AnalyticsBreadcrumbs items={[{ label: "Studio" }, { label: "Analytics" }]} />
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

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsEngagementPanel totals={portfolio.totals} deltas={portfolio.deltas} />
        <AnalyticsCountriesPanel countries={portfolio.countries} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[11px] tracking-[0.08em] text-fog uppercase">
          Views and link clicks over time
        </h2>
        <div className="rounded-2xl bg-obsidian p-4 sm:p-5 card-ring">
          <AnalyticsTrendChart series={portfolio.series} />
        </div>
      </section>

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
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-[11px] tracking-[0.08em] text-fog uppercase">Games</h2>
            <span className="stat-mono text-xs text-fog">{portfolio.gameCount}</span>
          </div>
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
