CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "game_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"category_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_categories" ADD CONSTRAINT "game_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_sort_idx" ON "categories" USING btree ("sort_order","name");--> statement-breakpoint
CREATE UNIQUE INDEX "game_categories_game_category_idx" ON "game_categories" USING btree ("game_id","category_id");--> statement-breakpoint
CREATE INDEX "game_categories_category_idx" ON "game_categories" USING btree ("category_id");--> statement-breakpoint
INSERT INTO "categories" ("slug", "name")
SELECT DISTINCT
  left(trim(both '-' from lower(regexp_replace(tag, '[^a-z0-9]+', '-', 'g'))), 80),
  left(btrim(tag), 40)
FROM "games"
CROSS JOIN LATERAL unnest("tags") AS tag
WHERE btrim(tag) <> ''
  AND trim(both '-' from lower(regexp_replace(tag, '[^a-z0-9]+', '-', 'g'))) <> ''
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "game_categories" ("game_id", "category_id")
SELECT DISTINCT g."id", c."id"
FROM "games" g
CROSS JOIN LATERAL unnest(g."tags") AS tag
JOIN "categories" c
  ON c."slug" = left(trim(both '-' from lower(regexp_replace(tag, '[^a-z0-9]+', '-', 'g'))), 80)
ON CONFLICT ("game_id", "category_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "tags";