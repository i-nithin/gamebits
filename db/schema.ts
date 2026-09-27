import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
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

export const games = pgTable(
  "games",
  {
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
    ownerClerkUserId: text("owner_clerk_user_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    outboundClicks: integer("outbound_clicks").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("games_catalog_idx").on(table.createdAt, table.id)],
);

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

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("categories_sort_idx").on(table.sortOrder, table.name)],
);

export const gameCategories = pgTable(
  "game_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("game_categories_game_category_idx").on(table.gameId, table.categoryId),
    index("game_categories_category_idx").on(table.categoryId),
  ],
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

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookmarks_user_game_idx").on(table.clerkUserId, table.gameId),
    index("bookmarks_user_created_idx").on(table.clerkUserId, table.createdAt),
  ],
);

export const likes = pgTable(
  "likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("likes_user_game_idx").on(table.clerkUserId, table.gameId),
    index("likes_game_idx").on(table.gameId),
  ],
);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerClerkUserId: text("follower_clerk_user_id").notNull(),
    followingClerkUserId: text("following_clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("follows_pair_idx").on(table.followerClerkUserId, table.followingClerkUserId),
    index("follows_following_idx").on(table.followingClerkUserId),
    check(
      "follows_no_self",
      sql`${table.followerClerkUserId} <> ${table.followingClerkUserId}`,
    ),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    clerkUserId: text("clerk_user_id").primaryKey(),
    handle: text("handle").notNull().unique(),
    name: text("name").notNull(),
    email: text("email"),
    imageUrl: text("image_url"),
    coverUrl: text("cover_url"),
    city: text("city"),
    country: text("country"),
    headline: text("headline"),
    bio: text("bio"),
    websiteUrl: text("website_url"),
    xUrl: text("x_url"),
    githubUrl: text("github_url"),
    linkedinUrl: text("linkedin_url"),
    redditUrl: text("reddit_url"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const notificationTypeEnum = pgEnum("notification_type", [
  "follow",
  "game_like",
  "game_upvote",
  "followee_publish",
  "followee_launch",
]);

export const notificationJobTypeEnum = pgEnum("notification_job_type", [
  "followee_publish",
  "followee_launch",
]);

export const notificationJobStatusEnum = pgEnum("notification_job_status", [
  "pending",
  "done",
  "failed",
]);

export type NotificationPayload = {
  actorName: string;
  actorHandle: string;
  actorImageUrl: string | null;
  gameId?: string;
  gameName?: string;
  gameSlug?: string;
  gameCoverUrl?: string | null;
  isoYear?: number;
  isoWeek?: number;
};

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientClerkUserId: text("recipient_clerk_user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    actorClerkUserId: text("actor_clerk_user_id").notNull(),
    actorCount: integer("actor_count").notNull().default(1),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    groupKey: text("group_key").notNull(),
    payload: jsonb("payload").$type<NotificationPayload>().notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(
      table.recipientClerkUserId,
      table.createdAt.desc(),
    ),
    index("notifications_recipient_read_created_idx").on(
      table.recipientClerkUserId,
      table.readAt,
      table.createdAt.desc(),
    ),
    uniqueIndex("notifications_unread_group_idx")
      .on(table.recipientClerkUserId, table.groupKey)
      .where(sql`${table.readAt} is null`),
  ],
);

export const notificationState = pgTable("notification_state", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  unreadCount: integer("unread_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: notificationJobTypeEnum("type").notNull(),
    actorClerkUserId: text("actor_clerk_user_id").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").$type<NotificationPayload>().notNull(),
    cursor: text("cursor"),
    status: notificationJobStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notification_jobs_status_created_idx").on(table.status, table.createdAt),
  ],
);
