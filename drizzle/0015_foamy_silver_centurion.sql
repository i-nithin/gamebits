ALTER TABLE "profiles" ADD COLUMN "super_admin" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "profiles" SET "super_admin" = true WHERE "clerk_user_id" = 'user_3JXPrazNth01J4NNYSwyWYtJbEO';
