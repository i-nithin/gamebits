"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { weekListings } from "@/db/schema";
import { WEEK_LISTING_CAP } from "@/lib/constants";
import { canManageGame, getCurrentUserId } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { countWeekListings, getGameById } from "@/lib/queries";

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

  const db = getDb();
  const existing = await db
    .select({ id: weekListings.id })
    .from(weekListings)
    .where(
      and(
        eq(weekListings.gameId, gameId),
        eq(weekListings.isoYear, year),
        eq(weekListings.isoWeek, week),
      ),
    )
    .limit(1);

  if (!existing[0]) {
    const count = await countWeekListings(year, week);
    if (count >= WEEK_LISTING_CAP) {
      return { error: `This week already has ${WEEK_LISTING_CAP} games` };
    }
    await db.insert(weekListings).values({
      gameId,
      isoYear: year,
      isoWeek: week,
      featured,
    });

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
  } else {
    await db
      .update(weekListings)
      .set({ featured })
      .where(eq(weekListings.id, existing[0].id));
  }

  revalidatePath("/");
  revalidatePath(`/week/${year}/${week}`);
  revalidatePath(`/games/${game.slug}`);
  revalidatePath("/4dm1n");
  redirect(`/games/${game.slug}`);
}
