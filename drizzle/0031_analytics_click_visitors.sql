CREATE TABLE "game_analytics_click_visitors" (
	"game_id" uuid NOT NULL,
	"visitor_key" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "game_analytics_click_visitors_pk" PRIMARY KEY("game_id","visitor_key","day")
);
--> statement-breakpoint
ALTER TABLE "game_analytics_click_visitors" ADD CONSTRAINT "game_analytics_click_visitors_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_analytics_click_visitors_game_day_idx" ON "game_analytics_click_visitors" USING btree ("game_id","day");