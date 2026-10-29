"use server";

import { revalidatePath } from "next/cache";

import { accountAccessError, canManageGame, getCurrentUserId } from "@/lib/auth-admin";
import { getGameById, placeGameOnWeek } from "@/lib/queries";

export async function launchGameAction(
  _prev: { error: string } | { ok: true } | null,
  formData: FormData,
): Promise<{ error: string } | { ok: true } | null> {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) return { error: blocked ?? "Sign in to continue" };

  const gameId = String(formData.get("gameId") ?? "");
  const year = Number(formData.get("year"));
  const week = Number(formData.get("week"));

  if (!gameId || !Number.isInteger(year) || !Number.isInteger(week)) {
    return { error: "Pick a valid ISO year and week" };
  }
  if (week < 1 || week > 53 || year < 2000 || year > 2100) {
    return { error: "ISO week must be 1–53" };
  }

  const game = await getGameById(gameId);
  if (!game) return { error: "Game not found" };
  if (!(await canManageGame(userId, game.ownerClerkUserId))) {
    return { error: "Unauthorized" };
  }
  if (game.archivedAt) {
    return { error: "Unarchive the game before launching" };
  }

  const placed = await placeGameOnWeek({ gameId, year, week, featured: null });
  if (!placed.ok) return { error: placed.error };

  if (placed.created) {
    const { ensureActorPayload, enqueueFollowerFanout } = await import(
      "@/lib/notifications"
    );
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
  revalidatePath("/4dm1n");
  return { ok: true };
}
