CREATE TABLE "game_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_platforms_game_platform_idx" ON "game_platforms" USING btree ("game_id","platform_id");--> statement-breakpoint
CREATE INDEX "game_platforms_platform_idx" ON "game_platforms" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "platforms_sort_idx" ON "platforms" USING btree ("sort_order","name");--> statement-breakpoint
INSERT INTO "platforms" ("slug", "name", "logo_url", "sort_order") VALUES
	('windows', 'Windows', '/platforms/windows.svg', 10),
	('macos', 'macOS', '/platforms/macos.svg', 20),
	('ios', 'iOS', '/platforms/ios.svg', 30),
	('android', 'Android', '/platforms/android.svg', 40),
	('web', 'Web', '/platforms/web.svg', 50),
	('nintendo', 'Nintendo', '/platforms/nintendo.svg', 60),
	('playstation', 'PlayStation', '/platforms/playstation.svg', 70),
	('xbox', 'Xbox', '/platforms/xbox.svg', 80)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "game_platforms" ("game_id", "platform_id")
SELECT g.id, p.id
FROM "games" g
CROSS JOIN LATERAL unnest(g.platforms) AS plat(name)
INNER JOIN "platforms" p ON p.slug = CASE lower(trim(plat.name))
	WHEN 'pc' THEN 'windows'
	WHEN 'windows' THEN 'windows'
	WHEN 'win' THEN 'windows'
	WHEN 'macos' THEN 'macos'
	WHEN 'mac' THEN 'macos'
	WHEN 'osx' THEN 'macos'
	WHEN 'ios' THEN 'ios'
	WHEN 'iphone' THEN 'ios'
	WHEN 'ipad' THEN 'ios'
	WHEN 'android' THEN 'android'
	WHEN 'web' THEN 'web'
	WHEN 'browser' THEN 'web'
	WHEN 'nintendo' THEN 'nintendo'
	WHEN 'switch' THEN 'nintendo'
	WHEN 'playstation' THEN 'playstation'
	WHEN 'ps4' THEN 'playstation'
	WHEN 'ps5' THEN 'playstation'
	WHEN 'xbox' THEN 'xbox'
	ELSE NULL
END
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "platforms";