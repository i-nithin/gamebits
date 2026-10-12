DROP INDEX "bookmarks_user_created_idx";--> statement-breakpoint
CREATE INDEX "follows_follower_created_idx" ON "follows" USING btree ("follower_clerk_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "follows_following_created_idx" ON "follows" USING btree ("following_clerk_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "game_reviews_user_created_idx" ON "game_reviews" USING btree ("clerk_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "games_owner_created_idx" ON "games" USING btree ("owner_clerk_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "games_owner_archived_idx" ON "games" USING btree ("owner_clerk_user_id","archived_at","id");--> statement-breakpoint
CREATE INDEX "likes_user_created_idx" ON "likes" USING btree ("clerk_user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "bookmarks_user_created_idx" ON "bookmarks" USING btree ("clerk_user_id","created_at","id");