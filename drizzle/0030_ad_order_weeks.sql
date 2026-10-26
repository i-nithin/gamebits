CREATE TABLE "ad_order_weeks" (
	"order_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	CONSTRAINT "ad_order_weeks_order_id_week_start_pk" PRIMARY KEY("order_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "ad_order_weeks" ADD CONSTRAINT "ad_order_weeks_order_id_ad_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."ad_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_order_weeks_week_idx" ON "ad_order_weeks" USING btree ("week_start");