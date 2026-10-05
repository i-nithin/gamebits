CREATE TYPE "public"."ad_payment_status" AS ENUM('checkout', 'paid', 'failed', 'refunded', 'waived');--> statement-breakpoint
CREATE TABLE "dodo_webhook_events" (
	"webhook_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "payment_status" "ad_payment_status" DEFAULT 'waived' NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "dodo_product_id" text;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "dodo_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "dodo_payment_id" text;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "dodo_customer_id" text;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "amount_cents" integer;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "ad_orders" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "ad_orders_dodo_payment_idx" ON "ad_orders" USING btree ("dodo_payment_id");