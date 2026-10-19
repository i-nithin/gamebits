import { notFound } from "next/navigation";

import { RecordPageView } from "@/components/analytics/record-page-view";
import { GameDetail } from "@/components/game/game-detail";
import { getCurrentUserId } from "@/lib/auth-admin";
import { getIsoWeekUtc } from "@/lib/iso-week";
import { getGamePageData } from "@/lib/queries";

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
  const data = await getGamePageData(slug, userId, reviewId);
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
        signedIn={Boolean(userId)}
        viewerId={userId}
        highlightReviewId={reviewId && data.reviews.some((review) => review.id === reviewId) ? reviewId : null}
        launchRequested={query.launch === "1" && (data.isOwner || data.isAdmin)}
        launchYear={current.year}
        launchWeek={current.week}
      />
    </>
  );
}
