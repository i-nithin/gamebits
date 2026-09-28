CREATE TYPE "public"."analytics_event_kind" AS ENUM('page_view', 'link_click');--> statement-breakpoint
CREATE TABLE "game_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"kind" "analytics_event_kind" NOT NULL,
	"link_kind" text,
	"clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_analytics_events_kind_link" CHECK (("game_analytics_events"."kind" = 'page_view' and "game_analytics_events"."link_kind" is null) or ("game_analytics_events"."kind" = 'link_click' and "game_analytics_events"."link_kind" is not null))
);
--> statement-breakpoint
ALTER TABLE "game_analytics_events" ADD CONSTRAINT "game_analytics_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_analytics_events_game_kind_created_idx" ON "game_analytics_events" USING btree ("game_id","kind","created_at");