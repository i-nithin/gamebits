CREATE TYPE "public"."ad_booking_status" AS ENUM('pending', 'approved', 'rejected', 'removed');--> statement-breakpoint
CREATE TYPE "public"."ad_format" AS ENUM('brand', 'media');--> statement-breakpoint
CREATE TYPE "public"."ad_placement" AS ENUM('sidebar');--> statement-breakpoint
CREATE TABLE "ad_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement" "ad_placement" DEFAULT 'sidebar' NOT NULL,
	"format" "ad_format" NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"owner_clerk_user_id" text NOT NULL,
	"logo_url" text,
	"product_name" text,
	"tagline" text,
	"media_url" text,
	"destination_url" text NOT NULL,
	"slot_count" integer NOT NULL,
	"status" "ad_booking_status" DEFAULT 'pending' NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_clerk_user_id" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_orders_month_chk" CHECK ("ad_orders"."month" between 1 and 12),
	CONSTRAINT "ad_orders_year_chk" CHECK ("ad_orders"."year" between 2020 and 2100),
	CONSTRAINT "ad_orders_slots_chk" CHECK ("ad_orders"."slot_count" between 1 and 6),
	CONSTRAINT "ad_orders_destination_chk" CHECK ("ad_orders"."destination_url" like 'https://%'),
	CONSTRAINT "ad_orders_name_len_chk" CHECK ("ad_orders"."product_name" is null or char_length("ad_orders"."product_name") between 1 and 40),
	CONSTRAINT "ad_orders_tagline_len_chk" CHECK ("ad_orders"."tagline" is null or char_length("ad_orders"."tagline") between 1 and 80),
	CONSTRAINT "ad_orders_creative_chk" CHECK ((
        ("ad_orders"."format" = 'brand' and "ad_orders"."product_name" is not null and "ad_orders"."tagline" is not null and "ad_orders"."logo_url" is not null and "ad_orders"."media_url" is null)
        or
        ("ad_orders"."format" = 'media' and "ad_orders"."media_url" is not null and "ad_orders"."product_name" is null and "ad_orders"."tagline" is null and "ad_orders"."logo_url" is null)
      ))
);
--> statement-breakpoint
CREATE TABLE "ad_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "ad_booking_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_orders" ADD CONSTRAINT "ad_orders_owner_clerk_user_id_profiles_clerk_user_id_fk" FOREIGN KEY ("owner_clerk_user_id") REFERENCES "public"."profiles"("clerk_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_slots" ADD CONSTRAINT "ad_slots_order_id_ad_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."ad_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_orders_month_idx" ON "ad_orders" USING btree ("placement","year","month");--> statement-breakpoint
CREATE INDEX "ad_orders_owner_booked_idx" ON "ad_orders" USING btree ("owner_clerk_user_id","booked_at");--> statement-breakpoint
CREATE INDEX "ad_slots_order_idx" ON "ad_slots" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ad_slots_status_idx" ON "ad_slots" USING btree ("status");