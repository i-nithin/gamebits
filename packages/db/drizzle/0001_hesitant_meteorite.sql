CREATE TYPE "public"."game_link_kind" AS ENUM('web', 'steam', 'playstore', 'appstore', 'nintendo', 'playstation', 'xbox', 'discord', 'x');--> statement-breakpoint
CREATE TYPE "public"."game_media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TABLE "game_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"kind" "game_link_kind" NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"kind" "game_media_kind" NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"image_url" text,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "logo_url" text;--> statement-breakpoint
UPDATE "games" SET "logo_url" = "cover_url" WHERE "logo_url" IS NULL;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "logo_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "owner_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_links" ADD CONSTRAINT "game_links_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_media" ADD CONSTRAINT "game_media_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_reviews" ADD CONSTRAINT "game_reviews_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_links_game_kind_idx" ON "game_links" USING btree ("game_id","kind");--> statement-breakpoint
CREATE INDEX "game_media_game_idx" ON "game_media" USING btree ("game_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "game_reviews_user_game_idx" ON "game_reviews" USING btree ("clerk_user_id","game_id");--> statement-breakpoint
CREATE INDEX "game_reviews_game_created_idx" ON "game_reviews" USING btree ("game_id","created_at");