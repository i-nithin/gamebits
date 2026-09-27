CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "search_tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("name", '')), 'A') || setweight(to_tsvector('simple', coalesce("developer_name", '')), 'A') || setweight(to_tsvector('simple', coalesce("tagline", '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "search_tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("name", '')), 'A') || setweight(to_tsvector('simple', coalesce("handle", '')), 'A') || setweight(to_tsvector('simple', coalesce("headline", '')), 'B')) STORED;--> statement-breakpoint
CREATE INDEX "games_name_lower_idx" ON "games" USING btree (lower("name") text_pattern_ops) WHERE "games"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "games_name_trgm_idx" ON "games" USING gin (lower("name") gin_trgm_ops) WHERE "games"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "games_developer_trgm_idx" ON "games" USING gin (lower("developer_name") gin_trgm_ops) WHERE "games"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "games_search_tsv_idx" ON "games" USING gin ("search_tsv") WHERE "games"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "profiles_name_lower_idx" ON "profiles" USING btree (lower("name") text_pattern_ops);--> statement-breakpoint
CREATE INDEX "profiles_handle_lower_idx" ON "profiles" USING btree (lower("handle") text_pattern_ops);--> statement-breakpoint
CREATE INDEX "profiles_name_trgm_idx" ON "profiles" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profiles_handle_trgm_idx" ON "profiles" USING gin (lower("handle") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profiles_search_tsv_idx" ON "profiles" USING gin ("search_tsv");