ALTER TABLE "game_analytics_events" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "game_analytics_daily" ADD COLUMN "countries" jsonb DEFAULT '{}'::jsonb NOT NULL;
