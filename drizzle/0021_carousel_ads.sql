CREATE TYPE "public"."carousel_badge" AS ENUM('coming_soon', 'pre_release', 'new_arrival', 'pre_register', 'special_event');--> statement-breakpoint
CREATE TYPE "public"."iarc_rating" AS ENUM('3', '7', '12', '16', '18');--> statement-breakpoint
ALTER TYPE "public"."ad_placement" ADD VALUE 'carousel';--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "game_id" uuid;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "badge" "carousel_badge";--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "countdown_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "iarc_rating" "iarc_rating";--> statement-breakpoint
ALTER TABLE "ad_orders" ADD CONSTRAINT "ad_orders_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_orders_game_idx" ON "ad_orders" USING btree ("game_id");