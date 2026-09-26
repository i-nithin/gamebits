"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  BadgeCheckIcon,
  Gamepad2Icon,
  GlobeIcon,
  JoystickIcon,
  MessageCircleIcon,
  SmartphoneIcon,
} from "lucide-react";

import { BookmarkButton } from "@/components/game/bookmark-button";
import { LikeButton } from "@/components/game/like-button";
import { GameGallery } from "@/components/game/game-gallery";
import { GameItemToolbar } from "@/components/game/game-item-toolbar";
import { GameReviews } from "@/components/game/game-reviews";
import { PlatformChipList } from "@/components/game/platform-chip";
import { VoteButton } from "@/components/game/vote-button";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GAME_LINK_FIELDS, GAME_STATUS_LABELS, type GameLinkKind } from "@/lib/constants";
import { formatIsoWeekLabel, weekHref } from "@/lib/iso-week";
import type { GamePageData } from "@/lib/types";

const LINK_ICONS: Record<GameLinkKind, typeof GlobeIcon> = {
  web: GlobeIcon,
  steam: Gamepad2Icon,
  playstore: SmartphoneIcon,
  appstore: SmartphoneIcon,
  nintendo: JoystickIcon,
  playstation: JoystickIcon,
  xbox: Gamepad2Icon,
  discord: MessageCircleIcon,
  x: MessageCircleIcon,
};

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
  const weekLabel = formatIsoWeekLabel(year, week);

  const stats = [
    { label: "Rank", value: game.rank > 0 ? `#${game.rank}` : "—" },
    { label: "Votes", value: String(game.voteCount) },
    { label: "Rating", value: ratingLabel },
    { label: "Launches", value: String(data.launches.length) },
  ];

  return (
    <article className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:gap-10">
        <GameGallery
          media={data.media}
          fallbackUrl={game.coverUrl}
          trailerUrl={game.trailerUrl}
          name={game.name}
        />

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-graphite card-ring">
                <Image
                  src={game.logoUrl || game.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-medium tracking-tight sm:text-3xl">
                  {game.name}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-fog">
                  <span className="truncate font-medium text-paper-white">{game.developerName}</span>
                  <BadgeCheckIcon className="size-4 shrink-0 text-ice-strong" />
                </p>
              </div>
            </div>
            <GameItemToolbar slug={game.slug} links={data.links} canManage={canManage} />
          </div>

          <p className="text-base leading-6 text-fog">{game.tagline}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{GAME_STATUS_LABELS[game.status]}</Badge>
            {data.archived ? <Badge variant="outline">Archived</Badge> : null}
            {game.featured ? <Badge variant="outline">Featured</Badge> : null}
            {game.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            <PlatformChipList platforms={game.platforms} />
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-iron card-ring sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 bg-obsidian px-4 py-3">
                <span className="text-[11px] tracking-[0.08em] text-fog uppercase">{stat.label}</span>
                <span className="stat-mono text-lg text-paper-white">{stat.value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-obsidian p-4 card-ring">
            <p className="text-[11px] tracking-[0.08em] text-fog uppercase">
              {live ? `Live · ${weekLabel}` : weekLabel}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={`/out/${game.slug}`}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-ice-strong text-sm font-medium text-paper-white hover:bg-ice-strong/90"
              >
                Play
                <ArrowUpRightIcon className="size-4" />
              </a>
              <VoteButton
                gameId={game.id}
                year={year}
                week={week}
                voteCount={game.voteCount}
                voted={game.voted}
                live={live}
                wide
              />
              <LikeButton gameId={game.id} liked={data.liked} likeCount={data.likeCount} />
              <BookmarkButton gameId={game.id} bookmarked={data.bookmarked} />
            </div>
          </div>
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
            {data.reviewCount > 0 ? (
              <span className="stat-mono text-xs text-fog">{data.reviewCount}</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex flex-col gap-6 pt-6">
          <p className="max-w-3xl text-sm leading-7 whitespace-pre-wrap text-paper-white">
            {game.description}
          </p>
          {game.platforms.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] tracking-[0.08em] text-fog uppercase">Available on</p>
              <div className="flex flex-wrap gap-2">
                {game.platforms.map((platform) => (
                  <span
                    key={platform.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-obsidian px-3 py-2 text-sm card-ring"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={platform.logoUrl} alt="" className="size-4 object-contain" />
                    {platform.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {data.links.length > 0 ? (
            <>
              <Separator className="bg-iron" />
              <div className="flex flex-col gap-3">
                <p className="text-[11px] tracking-[0.08em] text-fog uppercase">Links</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.links.map((link) => {
                    const field = GAME_LINK_FIELDS.find((item) => item.kind === link.kind);
                    const Icon = LINK_ICONS[link.kind] ?? GlobeIcon;
                    return (
                      <a
                        key={link.kind}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl bg-obsidian px-3 py-3 card-ring hover:bg-graphite"
                      >
                        {link.kind === "x" ? (
                          <span className="flex size-8 items-center justify-center rounded-lg bg-graphite text-xs font-medium">
                            X
                          </span>
                        ) : (
                          <span className="flex size-8 items-center justify-center rounded-lg bg-graphite text-fog">
                            <Icon className="size-4" strokeWidth={1.5} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {field?.label ?? link.kind}
                        </span>
                        <ArrowUpRightIcon className="size-4 shrink-0 text-fog" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="launches" className="pt-6">
          {data.launches.length === 0 ? (
            <Empty className="border border-dashed border-iron">
              <EmptyHeader>
                <EmptyTitle>No launches yet</EmptyTitle>
                <EmptyDescription>
                  When this game is listed on a weekly board, those campaigns will show up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.launches.map((launch) => (
                <li key={`${launch.year}-${launch.week}`}>
                  <Link
                    href={weekHref(launch.year, launch.week)}
                    className="flex items-center justify-between gap-3 rounded-xl bg-obsidian px-4 py-3 card-ring hover:bg-graphite"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {formatIsoWeekLabel(launch.year, launch.week)}
                      </span>
                      <span className="stat-mono text-xs text-fog">
                        {launch.rank > 0 ? `#${launch.rank}` : "Unranked"}
                        {` · ${launch.voteCount} votes`}
                      </span>
                    </span>
                    <Badge variant={launch.live ? "secondary" : "outline"}>
                      {launch.live ? "Live" : "Frozen"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="pt-6">
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
        </TabsContent>
      </Tabs>
    </article>
  );
}
