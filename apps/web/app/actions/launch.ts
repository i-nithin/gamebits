"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageGame, getCurrentUserId } from "@/lib/auth-admin";
import { getGameById } from "@/lib/queries";
import { assignWeekListing } from "@gamebits/core/week";

export async function launchGameAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Sign in to continue" };

  const gameId = String(formData.get("gameId") ?? "");
  const year = Number(formData.get("year"));
  const week = Number(formData.get("week"));
  const featured = formData.get("featured") === "on";

  const game = await getGameById(gameId);
  if (!game) return { error: "Game not found" };
  if (!(await canManageGame(userId, game.ownerClerkUserId))) {
    return { error: "Unauthorized" };
  }

  let result;
  try {
    result = await assignWeekListing({ gameId, year, week, featured });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not launch" };
  }

  if (result.created) {
    const { ensureActorPayload, enqueueFollowerFanout } = await import("@/lib/notifications");
    const actor = await ensureActorPayload(userId);
    void enqueueFollowerFanout({
      type: "followee_launch",
      actorId: userId,
      entityId: gameId,
      groupKey: `followee_launch:${gameId}:${year}:${week}`,
      payload: {
        ...actor,
        gameId,
        gameName: game.name,
        gameSlug: game.slug,
        gameCoverUrl: game.coverUrl,
        isoYear: year,
        isoWeek: week,
      },
    }).catch((error) => console.error("[notifications] launch fan-out failed", error));
  }

  revalidatePath("/");
  revalidatePath(`/week/${year}/${week}`);
  revalidatePath(`/games/${game.slug}`);
  redirect(`/games/${game.slug}`);
}
