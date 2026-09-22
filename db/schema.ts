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

export const gameMediaKindEnum = pgEnum("game_media_kind", ["image", "video"]);

export const gameLinkKindEnum = pgEnum("game_link_kind", [
  "web",
  "steam",
  "playstore",
  "appstore",
  "nintendo",
  "playstation",
  "xbox",
  "discord",
  "x",
]);

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url").notNull(),
  logoUrl: text("logo_url").notNull(),
  trailerUrl: text("trailer_url"),
  developerName: text("developer_name").notNull(),
  primaryUrl: text("primary_url").notNull(),
  status: gameStatusEnum("status").notNull(),
  tags: text("tags").array().notNull(),
  ownerClerkUserId: text("owner_clerk_user_id"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  outboundClicks: integer("outbound_clicks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameMedia = pgTable(
  "game_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    kind: gameMediaKindEnum("kind").notNull(),
    url: text("url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("game_media_game_idx").on(table.gameId, table.sortOrder),
  ],
);

export const platforms = pgTable(
  "platforms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    logoUrl: text("logo_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("platforms_sort_idx").on(table.sortOrder, table.name)],
);

export const gamePlatforms = pgTable(
  "game_platforms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("game_platforms_game_platform_idx").on(table.gameId, table.platformId),
    index("game_platforms_platform_idx").on(table.platformId),
  ],
);

export const gameLinks = pgTable(
  "game_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    kind: gameLinkKindEnum("kind").notNull(),
    url: text("url").notNull(),
  },
  (table) => [
    uniqueIndex("game_links_game_kind_idx").on(table.gameId, table.kind),
  ],
);

export const gameReviews = pgTable(
  "game_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    displayName: text("display_name").notNull(),
    imageUrl: text("image_url"),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("game_reviews_user_game_idx").on(table.clerkUserId, table.gameId),
    index("game_reviews_game_created_idx").on(table.gameId, table.createdAt),
  ],
);

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
