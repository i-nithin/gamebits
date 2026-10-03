"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { games } from "@/db/schema";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { isIsoWeekLive } from "@/lib/iso-week";
import {
  emitDirectNotification,
  ensureActorPayload,
} from "@/lib/notifications";
import { toggleWeekVote } from "@/lib/queries";

export async function toggleVoteAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }

  const gameId = String(formData.get("gameId") ?? "");
  const year = Number(formData.get("year"));
  const week = Number(formData.get("week"));

  if (!gameId || !Number.isInteger(year) || !Number.isInteger(week)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (!isIsoWeekLive(year, week)) {
    return { ok: false as const, reason: "frozen" as const };
  }

  const result = await toggleWeekVote({ userId, gameId, year, week });

  if (result.voted) {
    void (async () => {
      const db = getDb();
      const [game] = await db
        .select({
          id: games.id,
          name: games.name,
          slug: games.slug,
          coverUrl: games.coverUrl,
          ownerClerkUserId: games.ownerClerkUserId,
        })
        .from(games)
        .where(and(eq(games.id, gameId), isNull(games.archivedAt)))
        .limit(1);
      if (!game?.ownerClerkUserId || game.ownerClerkUserId === userId) return;

      const actor = await ensureActorPayload(userId);
      await emitDirectNotification({
        recipientId: game.ownerClerkUserId,
        actorId: userId,
        type: "game_upvote",
        entityType: "game",
        entityId: game.id,
        groupKey: `game_upvote:${game.id}:${year}:${week}`,
        payload: {
          ...actor,
          gameId: game.id,
          gameName: game.name,
          gameSlug: game.slug,
          gameCoverUrl: game.coverUrl,
          isoYear: year,
          isoWeek: week,
        },
        aggregate: true,
      });
    })().catch((error) => console.error("[notifications] upvote emit failed", error));
  }

  revalidatePath("/");
  revalidatePath(`/week/${year}/${week}`);
  revalidatePath("/games", "layout");
  return { ok: true as const };
}
