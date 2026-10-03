"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { games } from "@/db/schema";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import {
  emitDirectNotification,
  ensureActorPayload,
} from "@/lib/notifications";
import { getProfileHandle } from "@/lib/profile";
import { toggleLike } from "@/lib/queries";

export async function toggleLikeAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const result = await toggleLike({ userId, gameId });
  if (!result) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (result.liked) {
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
        type: "game_like",
        entityType: "game",
        entityId: game.id,
        groupKey: `game_like:${game.id}`,
        payload: {
          ...actor,
          gameId: game.id,
          gameName: game.name,
          gameSlug: game.slug,
          gameCoverUrl: game.coverUrl,
        },
        aggregate: true,
      });
    })().catch((error) => console.error("[notifications] like emit failed", error));
  }

  revalidatePath(`/games/${result.slug}`);
  const handle = await getProfileHandle(userId);
  if (handle) revalidatePath(`/u/${handle}`);
  return { ok: true as const, liked: result.liked, likeCount: result.likeCount };
}
