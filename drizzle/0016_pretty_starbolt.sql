CREATE INDEX "categories_name_trgm_idx" ON "categories" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "categories_slug_trgm_idx" ON "categories" USING gin (lower("slug") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "games_slug_trgm_idx" ON "games" USING gin (lower("slug") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "platforms_name_trgm_idx" ON "platforms" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "platforms_slug_trgm_idx" ON "platforms" USING gin (lower("slug") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profiles_email_trgm_idx" ON "profiles" USING gin (lower(coalesce("email", '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profiles_joined_idx" ON "profiles" USING btree ("joined_at","clerk_user_id");--> statement-breakpoint
CREATE INDEX "profiles_super_admin_idx" ON "profiles" USING btree ("clerk_user_id") WHERE "profiles"."super_admin" = true;