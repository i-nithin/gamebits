import { count, sql } from "drizzle-orm";

import { getDb, hasDatabase } from "@gamebits/db";
import { games, profiles, votes } from "@gamebits/db/schema";
import { getIsoWeekUtc } from "@gamebits/db/iso-week";

import { WEEK_LISTING_CAP } from "./constants";
import { countWeekListings } from "./queries";

export async function getOperatorOverview() {
  const current = getIsoWeekUtc();
  if (!hasDatabase()) {
    return {
      games: 0,
      profiles: 0,
      weekFill: 0,
      weekCap: WEEK_LISTING_CAP,
      year: current.year,
      week: current.week,
      pageViews: 0,
      linkClicks: 0,
      votes: 0,
    };
  }

  const db = getDb();
  const [gameRow, profileRow, voteRow, trafficRow, weekFill] = await Promise.all([
    db.select({ total: count() }).from(games),
    db.select({ total: count() }).from(profiles),
    db.select({ total: count() }).from(votes),
    db
      .select({
        pageViews: sql<number>`coalesce(sum(${games.pageViews}), 0)::int`,
        linkClicks: sql<number>`coalesce(sum(${games.outboundClicks}), 0)::int`,
      })
      .from(games),
    countWeekListings(current.year, current.week),
  ]);

  return {
    games: Number(gameRow[0]?.total ?? 0),
    profiles: Number(profileRow[0]?.total ?? 0),
    weekFill,
    weekCap: WEEK_LISTING_CAP,
    year: current.year,
    week: current.week,
    pageViews: Number(trafficRow[0]?.pageViews ?? 0),
    linkClicks: Number(trafficRow[0]?.linkClicks ?? 0),
    votes: Number(voteRow[0]?.total ?? 0),
  };
}
