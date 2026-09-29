CREATE TABLE "notification_preferences" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"follow" boolean DEFAULT true NOT NULL,
	"game_like" boolean DEFAULT true NOT NULL,
	"game_upvote" boolean DEFAULT true NOT NULL,
	"followee_publish" boolean DEFAULT true NOT NULL,
	"followee_launch" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
