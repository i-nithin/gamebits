"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheckIcon } from "lucide-react";

import { GameGallery } from "@/components/game/game-gallery";
import { GameItemToolbar } from "@/components/game/game-item-toolbar";
import { GameReviews } from "@/components/game/game-reviews";
import { PlatformChipList } from "@/components/game/platform-chip";
import { VoteButton } from "@/components/game/vote-button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GAME_LINK_FIELDS, GAME_STATUS_LABELS } from "@/lib/constants";
import { formatIsoWeekLabel, weekHref } from "@/lib/iso-week";
import type { GamePageData } from "@/lib/types";

export function GameDetail({
  data,
  year,
  week,
  live,
  signedIn,
  displayName,
  imageUrl,
}: {
  data: GamePageData;
  year: number;
  week: number;
  live: boolean;
  signedIn: boolean;
  displayName: string;
  imageUrl: string | null;
}) {
  const { game } = data;
  const canManage = data.isOwner || data.isAdmin;
  const ratingLabel =
    data.reviewCount > 0 && data.reviewAverage != null
      ? data.reviewAverage.toFixed(1)
      : "—";

  const stats = [
    { label: "Rank", value: game.rank > 0 ? `#${game.rank}` : "—", mono: true },
    { label: "Votes", value: String(game.voteCount), mono: true },
    { label: "Rating", value: ratingLabel, mono: true },
    { label: "Launches", value: String(data.launches.length), mono: true },
  ];

  return (
    <article className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <GameGallery
          media={data.media}
          fallbackUrl={game.coverUrl}
          trailerUrl={game.trailerUrl}
          name={game.name}
        />

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <h1 className="min-w-0 text-[32px] leading-none font-medium tracking-tight">
              {game.name}
            </h1>
            <GameItemToolbar
              slug={game.slug}
              links={data.links}
              canManage={canManage}
              vote={{
                gameId: game.id,
                year,
                week,
                voteCount: game.voteCount,
                voted: game.voted,
                live,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="relative size-5 overflow-hidden rounded-full">
              <Image
                src={game.logoUrl || game.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="20px"
              />
            </span>
            <span className="font-medium">{game.developerName}</span>
            <BadgeCheckIcon className="size-4 text-ice-strong" />
            {data.archived ? <span className="text-fog">Archived</span> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-iron px-2 py-1 text-[11px] tracking-wide text-fog uppercase">
              {GAME_STATUS_LABELS[game.status]}
            </span>
            <PlatformChipList platforms={game.platforms} />
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-iron card-ring sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 bg-graphite px-4 py-3">
                <span className="text-[11px] tracking-[0.08em] text-fog uppercase">
                  {stat.label}
                </span>
                <span className={stat.mono ? "stat-mono text-base text-paper-white" : "text-base"}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-xl bg-graphite p-4 card-ring">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] tracking-[0.08em] text-fog uppercase">Play</span>
              <p className="text-[28px] leading-none font-medium">{game.tagline}</p>
              <p className="text-xs tracking-wide text-fog uppercase">
                {live ? `Live · ${formatIsoWeekLabel(year, week)}` : formatIsoWeekLabel(year, week)}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <VoteButton
                gameId={game.id}
                year={year}
                week={week}
                voteCount={game.voteCount}
                voted={game.voted}
                live={live}
                wide
              />
              <a
                href={`/out/${game.slug}`}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center rounded-full bg-ice-strong text-sm font-medium text-paper-white hover:bg-ice-strong/90"
              >
                Play / Visit
              </a>
            </div>
          </div>

          <Tabs defaultValue="details" className="gap-0">
            <TabsList
              variant="line"
              className="h-11 w-full justify-start gap-6 rounded-none border-b border-iron bg-transparent p-0"
            >
              <TabsTrigger
                value="details"
                className="h-11 flex-none rounded-none px-0 text-sm text-fog data-active:bg-transparent data-active:text-paper-white dark:data-active:bg-transparent"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="launches"
                className="h-11 flex-none rounded-none px-0 text-sm text-fog data-active:bg-transparent data-active:text-paper-white dark:data-active:bg-transparent"
              >
                Launches
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="h-11 flex-none rounded-none px-0 text-sm text-fog data-active:bg-transparent data-active:text-paper-white dark:data-active:bg-transparent"
              >
                Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="pt-4">
              <div className="flex flex-col gap-4 rounded-xl bg-graphite p-4 card-ring">
                <p className="text-sm leading-6 text-paper-white">{game.tagline}</p>
                <p className="text-sm leading-6 text-fog whitespace-pre-wrap">{game.description}</p>
                {game.platforms.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {game.platforms.map((platform) => (
                      <div key={platform.id} className="flex flex-col gap-1 rounded-lg bg-charcoal px-3 py-2.5">
                        <span className="text-[11px] tracking-[0.08em] text-fog uppercase">
                          Platform
                        </span>
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={platform.logoUrl} alt="" className="size-4 object-contain" />
                          {platform.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {data.links.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {data.links.map((link) => {
                      const field = GAME_LINK_FIELDS.find((item) => item.kind === link.kind);
                      return (
                        <a
                          key={link.kind}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-ice-signal hover:underline"
                        >
                          {field?.label ?? link.kind}
                        </a>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="launches" className="pt-4">
              <div className="rounded-xl bg-graphite p-4 card-ring">
                {data.launches.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>No launches yet</EmptyTitle>
                      <EmptyDescription>
                        When this game is listed on a weekly board, those campaigns will show up here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <ul className="flex flex-col">
                    {data.launches.map((launch) => (
                      <li key={`${launch.year}-${launch.week}`}>
                        <Link
                          href={weekHref(launch.year, launch.week)}
                          className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-slate"
                        >
                          <span className="text-sm">{formatIsoWeekLabel(launch.year, launch.week)}</span>
                          <span className="stat-mono text-xs text-fog">
                            {launch.live ? "Live" : "Frozen"}
                            {launch.rank > 0 ? ` · #${launch.rank}` : ""}
                            {` · ${launch.voteCount}`}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="pt-4">
              <div className="rounded-xl bg-graphite p-4 card-ring">
                <GameReviews
                  slug={game.slug}
                  gameId={game.id}
                  signedIn={signedIn}
                  displayName={displayName}
                  imageUrl={imageUrl}
                  initialReviews={data.reviews}
                  nextCursor={data.reviewsNextCursor}
                  average={data.reviewAverage}
                  count={data.reviewCount}
                  viewerReview={data.viewerReview}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </article>
  );
}
