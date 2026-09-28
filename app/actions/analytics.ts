"use server";

import { eq } from "drizzle-orm";

import { games } from "@/db/schema";
import { recordPageView } from "@/lib/analytics/record";
import { getCurrentUserId, isAdminUserId } from "@/lib/auth-admin";
import { getDb, hasDatabase } from "@/lib/db";
import { isUuid } from "@/lib/sanitize";

export async function recordPageViewAction(gameId: string) {
  if (!isUuid(gameId) || !hasDatabase()) return;
  const userId = await getCurrentUserId();
  if (isAdminUserId(userId)) return;

  const db = getDb();
  const [game] = await db
    .select({
      id: games.id,
      ownerClerkUserId: games.ownerClerkUserId,
      archivedAt: games.archivedAt,
    })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  if (!game || game.archivedAt) return;
  if (userId && game.ownerClerkUserId === userId) return;

  try {
    await recordPageView(game.id, userId);
  } catch (error) {
    console.error("[analytics] page view failed", error);
  }
}
