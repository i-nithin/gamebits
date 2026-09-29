CREATE TYPE "public"."game_status" AS ENUM('released', 'upcoming', 'early_access', 'demo', 'playtest', 'unreleased');--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"cover_url" text NOT NULL,
	"trailer_url" text,
	"developer_name" text NOT NULL,
	"primary_url" text NOT NULL,
	"status" "game_status" NOT NULL,
	"tags" text[] NOT NULL,
	"platforms" text[] NOT NULL,
	"outbound_clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"game_id" uuid NOT NULL,
	"iso_year" integer NOT NULL,
	"iso_week" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"iso_year" integer NOT NULL,
	"iso_week" integer NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_listings" ADD CONSTRAINT "week_listings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_user_game_week_idx" ON "votes" USING btree ("clerk_user_id","game_id","iso_year","iso_week");--> statement-breakpoint
CREATE INDEX "votes_week_game_idx" ON "votes" USING btree ("iso_year","iso_week","game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "week_listings_game_week_idx" ON "week_listings" USING btree ("game_id","iso_year","iso_week");--> statement-breakpoint
CREATE INDEX "week_listings_week_idx" ON "week_listings" USING btree ("iso_year","iso_week");