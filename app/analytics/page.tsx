import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

import { AnalyticsGameList } from "@/components/analytics/game-list";
import { analyticsPrimaryStats, analyticsSecondaryStats } from "@/components/analytics/stat-items";
import { AnalyticsSummary } from "@/components/analytics/stat-grid";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { getAnalyticsPortfolio } from "@/lib/analytics/queries";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";

export const metadata = {
  title: "Analytics · GameBits",
};

export default async function AnalyticsPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
        <AnalyticsHeading />
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>Sign in to see analytics</EmptyTitle>
            <EmptyDescription>
              Upvotes, page views, and link clicks for the games you add live here.
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

  const portfolio = await getAnalyticsPortfolio(userId);
  if (!portfolio) {
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
        <AnalyticsHeading />
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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 py-6 sm:px-6 sm:py-8">
      <AnalyticsHeading />
      <AnalyticsSummary
        primary={analyticsPrimaryStats(portfolio.totals, portfolio.gameCount)}
        secondary={analyticsSecondaryStats(portfolio.totals)}
      />
      {portfolio.games.length === 0 ? (
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>No games yet</EmptyTitle>
            <EmptyDescription>Add a game to start collecting upvotes, views, and clicks.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" className="rounded-full" render={<Link href="/games/new" />}>
            Add game
          </Button>
        </Empty>
      ) : (
        <AnalyticsGameList games={portfolio.games} />
      )}
    </div>
  );
}

function AnalyticsHeading() {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs tracking-wide text-fog uppercase">Studio</p>
      <h1 className="text-2xl font-medium sm:text-[32px]">Analytics</h1>
    </div>
  );
}
