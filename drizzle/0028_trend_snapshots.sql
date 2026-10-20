CREATE TYPE "public"."trend_period_kind" AS ENUM('day', 'week', 'month');--> statement-breakpoint
CREATE TABLE "trend_snapshot_ranks" (
	"snapshot_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"score" double precision NOT NULL,
	"hot" double precision NOT NULL,
	"baseline" double precision NOT NULL,
	"velocity" double precision NOT NULL,
	CONSTRAINT "trend_snapshot_ranks_snapshot_id_game_id_pk" PRIMARY KEY("snapshot_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "trend_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "trend_period_kind" NOT NULL,
	"period_key" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"sealed_at" timestamp with time zone,
	"game_count" integer NOT NULL,
	"event_mass" double precision NOT NULL,
	"regime" "trend_regime" NOT NULL,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trend_snapshot_ranks" ADD CONSTRAINT "trend_snapshot_ranks_snapshot_id_trend_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."trend_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_snapshot_ranks" ADD CONSTRAINT "trend_snapshot_ranks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trend_snapshot_ranks_rank_idx" ON "trend_snapshot_ranks" USING btree ("snapshot_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "trend_snapshots_period_idx" ON "trend_snapshots" USING btree ("kind","period_key");