import { notFound, redirect } from "next/navigation";

import { GameLaunchForm } from "@/components/game/game-launch-form";
import { canManageGame, getCurrentUserId } from "@/lib/auth-admin";
import { getIsoWeekUtc } from "@/lib/iso-week";
import { getGameBySlug, listGamePlatforms } from "@/lib/queries";

export default async function LaunchGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");

  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  if (!canManageGame(userId, game.ownerClerkUserId)) {
    redirect(`/games/${slug}`);
  }

  const current = getIsoWeekUtc();
  const platformItems = await listGamePlatforms(game.id);

  return (
    <GameLaunchForm
      game={{
        id: game.id,
        slug: game.slug,
        name: game.name,
        logoUrl: game.logoUrl,
        coverUrl: game.coverUrl,
        platforms: platformItems,
        developerName: game.developerName,
      }}
      defaultYear={current.year}
      defaultWeek={current.week}
    />
  );
}
