CREATE TYPE "public"."staff_role" AS ENUM('owner', 'admin', 'editor');--> statement-breakpoint
CREATE TABLE "staff" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"role" "staff_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "suspended_at" timestamp with time zone;
