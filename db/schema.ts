import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

function searchVector(expression: string): SQL {
  return sql.raw(expression);
}

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
    pageViews: integer("page_views").notNull().default(0),
    outboundClicks: integer("outbound_clicks").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      searchVector(
        `setweight(to_tsvector('simple', coalesce("name", '')), 'A') || setweight(to_tsvector('simple', coalesce("developer_name", '')), 'A') || setweight(to_tsvector('simple', coalesce("tagline", '')), 'B')`,
      ),
    ),
  },
  (table) => [
    index("games_catalog_idx").on(table.createdAt, table.id),
    index("games_name_lower_idx")
      .using("btree", sql`lower(${table.name}) text_pattern_ops`)
      .where(sql`${table.archivedAt} is null`),
    index("games_name_trgm_idx")
      .using("gin", sql`lower(${table.name}) gin_trgm_ops`)
      .where(sql`${table.archivedAt} is null`),
    index("games_developer_trgm_idx")
      .using("gin", sql`lower(${table.developerName}) gin_trgm_ops`)
      .where(sql`${table.archivedAt} is null`),
    index("games_search_tsv_idx")
      .using("gin", table.searchTsv)
      .where(sql`${table.archivedAt} is null`),
  ],
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
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      searchVector(
        `setweight(to_tsvector('simple', coalesce("name", '')), 'A') || setweight(to_tsvector('simple', coalesce("handle", '')), 'A') || setweight(to_tsvector('simple', coalesce("headline", '')), 'B')`,
      ),
    ),
  },
  (table) => [
    index("profiles_name_lower_idx").using("btree", sql`lower(${table.name}) text_pattern_ops`),
    index("profiles_handle_lower_idx").using(
      "btree",
      sql`lower(${table.handle}) text_pattern_ops`,
    ),
    index("profiles_name_trgm_idx").using("gin", sql`lower(${table.name}) gin_trgm_ops`),
    index("profiles_handle_trgm_idx").using("gin", sql`lower(${table.handle}) gin_trgm_ops`),
    index("profiles_search_tsv_idx").using("gin", table.searchTsv),
  ],
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

export const notificationPreferences = pgTable("notification_preferences", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  follow: boolean("follow").notNull().default(true),
  gameLike: boolean("game_like").notNull().default(true),
  gameUpvote: boolean("game_upvote").notNull().default(true),
  followeePublish: boolean("followee_publish").notNull().default(true),
  followeeLaunch: boolean("followee_launch").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsEventKindEnum = pgEnum("analytics_event_kind", [
  "page_view",
  "link_click",
]);

export const gameAnalyticsEvents = pgTable(
  "game_analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    kind: analyticsEventKindEnum("kind").notNull(),
    linkKind: text("link_kind"),
    clerkUserId: text("clerk_user_id"),
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("game_analytics_events_game_kind_created_idx").on(
      table.gameId,
      table.kind,
      table.createdAt,
    ),
    check(
      "game_analytics_events_kind_link",
      sql`(${table.kind} = 'page_view' and ${table.linkKind} is null) or (${table.kind} = 'link_click' and ${table.linkKind} is not null)`,
    ),
  ],
);

export type AnalyticsCountryBucket = {
  pageViews: number;
  linkClicks: number;
};

export const gameAnalyticsDaily = pgTable(
  "game_analytics_daily",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    pageViews: integer("page_views").notNull().default(0),
    linkClicks: integer("link_clicks").notNull().default(0),
    clicks: jsonb("clicks")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    countries: jsonb("countries")
      .$type<Record<string, AnalyticsCountryBucket>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.day], name: "game_analytics_daily_pk" }),
    index("game_analytics_daily_day_idx").on(table.day),
  ],
);

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
