import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { RecordPageView } from "@/components/analytics/record-page-view";
import { GameDetail } from "@/components/game/game-detail";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getIsoWeekUtc } from "@/lib/iso-week";
import { getViewer } from "@/lib/profile";
import { getGamePageData } from "@/lib/queries";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const userIdPromise = getCurrentUserId();
  const viewerPromise = getViewer();
  const userPromise = clerkEnabled ? currentUser() : Promise.resolve(null);
  const [{ slug }, query, userId, viewer, user] = await Promise.all([
    params,
    searchParams,
    userIdPromise,
    viewerPromise,
    userPromise,
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
        displayName={user?.fullName || user?.username || "Player"}
        imageUrl={viewer?.imageUrl ?? null}
        highlightReviewId={reviewId && data.reviews.some((review) => review.id === reviewId) ? reviewId : null}
      />
    </>
  );
}
