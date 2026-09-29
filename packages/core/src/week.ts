import { and, eq } from "drizzle-orm";

import { getDb } from "@gamebits/db";
import { weekListings } from "@gamebits/db/schema";

import { WEEK_LISTING_CAP } from "./constants";
import { countWeekListings, getGameById } from "./queries";

export async function assignWeekListing(input: {
  gameId: string;
  year: number;
  week: number;
  featured: boolean;
}) {
  const { gameId, year, week, featured } = input;
  if (!gameId || !Number.isInteger(year) || !Number.isInteger(week)) {
    throw new Error("Invalid week assignment");
  }
  if (week < 1 || week > 53 || year < 2000 || year > 2100) {
    throw new Error("ISO week must be 1–53");
  }

  const game = await getGameById(gameId);
  if (!game) throw new Error("Game not found");
  if (game.archivedAt) throw new Error("Unarchive the game before assigning it");

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
    const filled = await countWeekListings(year, week);
    if (filled >= WEEK_LISTING_CAP) {
      throw new Error(`This week already has ${WEEK_LISTING_CAP} games`);
    }
    await db.insert(weekListings).values({
      gameId,
      isoYear: year,
      isoWeek: week,
      featured,
    });
    return { game, created: true };
  }

  await db.update(weekListings).set({ featured }).where(eq(weekListings.id, existing[0].id));
  return { game, created: false };
}

export async function removeWeekListing(listingId: string) {
  if (!listingId) throw new Error("Missing listing");
  const db = getDb();
  await db.delete(weekListings).where(eq(weekListings.id, listingId));
}
