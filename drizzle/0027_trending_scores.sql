CREATE TYPE "public"."trend_regime" AS ENUM('sparse', 'growing', 'mature');--> statement-breakpoint
CREATE TABLE "game_trend_scores" (
	"game_id" uuid PRIMARY KEY NOT NULL,
	"score" double precision NOT NULL,
	"rank" integer NOT NULL,
	"hot" double precision NOT NULL,
	"baseline" double precision NOT NULL,
	"velocity" double precision NOT NULL,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_state" (
	"id" text PRIMARY KEY NOT NULL,
	"regime" "trend_regime" NOT NULL,
	"previous_regime" "trend_regime",
	"game_count" integer NOT NULL,
	"event_mass" double precision NOT NULL,
	"window_days" integer NOT NULL,
	"half_life_hours" integer NOT NULL,
	"prior_strength" double precision NOT NULL,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_trend_scores" ADD CONSTRAINT "game_trend_scores_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_trend_scores_rank_idx" ON "game_trend_scores" USING btree ("rank");