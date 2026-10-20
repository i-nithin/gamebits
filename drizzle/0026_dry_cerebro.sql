CREATE TYPE "public"."report_status" AS ENUM('open', 'dismissed', 'actioned');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('review', 'game');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'content_reported';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'content_removed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'account_banned';--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_clerk_user_id" text NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"subject_clerk_user_id" text,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by_clerk_user_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_reviews" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_reviews" ADD COLUMN "removed_by_ban" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "taken_down_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "hidden_by_ban" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "moderation_archive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "ban_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_open_reporter_target_idx" ON "reports" USING btree ("reporter_clerk_user_id","target_type","target_id") WHERE "reports"."status" = 'open';--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "reports_subject_status_idx" ON "reports" USING btree ("subject_clerk_user_id","status");--> statement-breakpoint
CREATE INDEX "reports_target_status_idx" ON "reports" USING btree ("target_type","target_id","status");