CREATE TYPE "public"."notification_job_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_job_type" AS ENUM('followee_publish', 'followee_launch');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('follow', 'game_like', 'game_upvote', 'followee_publish', 'followee_launch');--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_job_type" NOT NULL,
	"actor_clerk_user_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"cursor" text,
	"status" "notification_job_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_state" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_clerk_user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"actor_clerk_user_id" text NOT NULL,
	"actor_count" integer DEFAULT 1 NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"group_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notification_jobs_status_created_idx" ON "notification_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_clerk_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_created_idx" ON "notifications" USING btree ("recipient_clerk_user_id","read_at","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_unread_group_idx" ON "notifications" USING btree ("recipient_clerk_user_id","group_key") WHERE "notifications"."read_at" is null;