import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { GameDetail } from "@/components/game/game-detail";
import { getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getIsoWeekUtc } from "@/lib/iso-week";
import { getGamePageData } from "@/lib/queries";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const userId = await getCurrentUserId();
  const data = await getGamePageData(slug, userId);
  if (!data) notFound();

  const user = clerkEnabled ? await currentUser() : null;
  const current = getIsoWeekUtc();
  const liveLaunch = data.launches.find((launch) => launch.live);
  const year = liveLaunch?.year ?? data.launches[0]?.year ?? current.year;
  const week = liveLaunch?.week ?? data.launches[0]?.week ?? current.week;

  return (
    <GameDetail
      data={data}
      year={year}
      week={week}
      live={Boolean(liveLaunch)}
      signedIn={Boolean(userId)}
      displayName={user?.fullName || user?.username || "Player"}
      imageUrl={user?.imageUrl ?? null}
    />
  );
}
