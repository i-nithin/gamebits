ALTER TABLE "ad_orders" DROP CONSTRAINT "ad_orders_creative_chk";--> statement-breakpoint
ALTER TABLE "ad_orders" ADD CONSTRAINT "ad_orders_creative_chk" CHECK ((
        ("ad_orders"."placement" = 'sidebar' and "ad_orders"."format" = 'brand' and "ad_orders"."game_id" is null and "ad_orders"."badge" is null and "ad_orders"."countdown_ends_at" is null and "ad_orders"."product_name" is not null and "ad_orders"."tagline" is not null and "ad_orders"."logo_url" is not null and "ad_orders"."media_url" is null)
        or
        ("ad_orders"."placement" = 'sidebar' and "ad_orders"."format" = 'media' and "ad_orders"."game_id" is null and "ad_orders"."badge" is null and "ad_orders"."countdown_ends_at" is null and "ad_orders"."media_url" is not null and "ad_orders"."product_name" is null and "ad_orders"."tagline" is null and "ad_orders"."logo_url" is null)
        or
        ("ad_orders"."placement" <> 'sidebar' and "ad_orders"."format" = 'media' and "ad_orders"."game_id" is not null and "ad_orders"."media_url" is not null and "ad_orders"."product_name" is null and "ad_orders"."logo_url" is null and "ad_orders"."slot_count" = 1)
      ));
