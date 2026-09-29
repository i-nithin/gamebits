ALTER TABLE "games" ADD COLUMN "page_views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE "game_analytics_daily" (
	"game_id" uuid NOT NULL,
	"day" date NOT NULL,
	"page_views" integer DEFAULT 0 NOT NULL,
	"link_clicks" integer DEFAULT 0 NOT NULL,
	"clicks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "game_analytics_daily_pk" PRIMARY KEY("game_id","day")
);
--> statement-breakpoint
ALTER TABLE "game_analytics_daily" ADD CONSTRAINT "game_analytics_daily_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_analytics_daily_day_idx" ON "game_analytics_daily" USING btree ("day");--> statement-breakpoint
WITH daily AS (
	SELECT
		"game_id",
		("created_at" AT TIME ZONE 'utc')::date AS "day",
		count(*) FILTER (WHERE "kind" = 'page_view')::int AS "page_views",
		count(*) FILTER (WHERE "kind" = 'link_click')::int AS "link_clicks"
	FROM "game_analytics_events"
	GROUP BY 1, 2
),
click_parts AS (
	SELECT
		"game_id",
		("created_at" AT TIME ZONE 'utc')::date AS "day",
		"link_kind",
		count(*)::int AS "cnt"
	FROM "game_analytics_events"
	WHERE "kind" = 'link_click' AND "link_kind" IS NOT NULL
	GROUP BY 1, 2, 3
),
click_json AS (
	SELECT "game_id", "day", jsonb_object_agg("link_kind", "cnt") AS "clicks"
	FROM click_parts
	GROUP BY 1, 2
)
INSERT INTO "game_analytics_daily" ("game_id", "day", "page_views", "link_clicks", "clicks")
SELECT
	daily."game_id",
	daily."day",
	daily."page_views",
	daily."link_clicks",
	coalesce(click_json."clicks", '{}'::jsonb)
FROM daily
LEFT JOIN click_json
	ON click_json."game_id" = daily."game_id"
	AND click_json."day" = daily."day";--> statement-breakpoint
UPDATE "games"
SET "page_views" = sub."cnt"
FROM (
	SELECT "game_id", count(*)::int AS "cnt"
	FROM "game_analytics_events"
	WHERE "kind" = 'page_view'
	GROUP BY "game_id"
) AS sub
WHERE "games"."id" = sub."game_id";
