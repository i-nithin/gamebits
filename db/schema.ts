import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const gameStatusEnum = pgEnum("game_status", [
  "released",
  "upcoming",
  "early_access",
  "demo",
  "playtest",
  "unreleased",
]);

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url").notNull(),
  trailerUrl: text("trailer_url"),
  developerName: text("developer_name").notNull(),
  primaryUrl: text("primary_url").notNull(),
  status: gameStatusEnum("status").notNull(),
  tags: text("tags").array().notNull(),
  platforms: text("platforms").array().notNull(),
  outboundClicks: integer("outbound_clicks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weekListings = pgTable(
  "week_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    isoYear: integer("iso_year").notNull(),
    isoWeek: integer("iso_week").notNull(),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("week_listings_game_week_idx").on(
      table.gameId,
      table.isoYear,
      table.isoWeek,
    ),
    index("week_listings_week_idx").on(table.isoYear, table.isoWeek),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    isoYear: integer("iso_year").notNull(),
    isoWeek: integer("iso_week").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("votes_user_game_week_idx").on(
      table.clerkUserId,
      table.gameId,
      table.isoYear,
      table.isoWeek,
    ),
    index("votes_week_game_idx").on(table.isoYear, table.isoWeek, table.gameId),
  ],
);
