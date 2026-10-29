"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { games } from "@/db/schema";
import { countryFromHeaders } from "@/lib/analytics/geo";
import { recordPageView } from "@/lib/analytics/record";
import { resolveVisitorKey } from "@/lib/analytics/visitor";
import { getAdminAccess, getCurrentUserId } from "@/lib/auth-admin";
import { getDb, hasDatabase } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/sanitize";

export async function recordPageViewAction(gameId: string) {
  if (!isUuid(gameId) || !hasDatabase()) return;
  const requestHeaders = await headers();
  if ((await rateLimit("pageview", clientIp(requestHeaders))) !== "ok") return;
  const userId = await getCurrentUserId();
  if (await getAdminAccess(userId)) return;

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
    const visitorKey = await resolveVisitorKey(userId);
    if (!visitorKey) return;
    const country = countryFromHeaders(requestHeaders);
    await recordPageView(game.id, userId, country, visitorKey);
  } catch (error) {
    console.error("[analytics] page view failed", error);
  }
}
