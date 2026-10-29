import { notFound } from "next/navigation";

import { RecordPageView } from "@/components/analytics/record-page-view";
import { GameDetail } from "@/components/game/game-detail";
import { getCurrentUserId } from "@/lib/auth-admin";
import { getProfileHandle } from "@/lib/profile";
import { getIsoWeekUtc, hasIsoWeekStarted } from "@/lib/iso-week";
import { descriptionPlainText, sanitizeStoredDescription } from "@/lib/description";
import { getGameBySlug, getGamePageData } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return { title: "Game not found" };

  const description = descriptionPlainText(
    sanitizeStoredDescription(game.description),
  );
  return {
    title: game.name,
    description: description
      ? description.slice(0, 160)
      : `Discover ${game.name}, view its details, and follow its weekly ranking on GameBits.`,
    openGraph: { type: "website", title: game.name },
  };
}

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string; launch?: string }>;
}) {
  const [{ slug }, query, userId] = await Promise.all([
    params,
    searchParams,
    getCurrentUserId(),
  ]);
  const reviewId = query.review?.trim() || null;
  const [data, viewerHandle] = await Promise.all([
    getGamePageData(slug, userId, reviewId),
    userId ? getProfileHandle(userId) : Promise.resolve(null),
  ]);
  if (!data) notFound();

  const current = getIsoWeekUtc();
  const liveLaunch = data.launches.find((launch) => launch.live);
  const year = liveLaunch?.year ?? data.launches[0]?.year ?? current.year;
  const week = liveLaunch?.week ?? data.launches[0]?.week ?? current.week;

  return (
    <>
      {data.isOwner ? null : <RecordPageView gameId={data.game.id} />}
      <GameDetail
        data={data}
        year={year}
        week={week}
        live={Boolean(liveLaunch)}
        votingOpen={
          data.launches.some((launch) => launch.year === year && launch.week === week) &&
          hasIsoWeekStarted(year, week)
        }
        signedIn={Boolean(userId)}
        viewerHandle={viewerHandle}
        highlightReviewId={reviewId && data.reviews.some((review) => review.id === reviewId) ? reviewId : null}
        launchRequested={query.launch === "1" && (data.isOwner || data.isAdmin)}
        launchYear={current.year}
        launchWeek={current.week}
      />
    </>
  );
}
