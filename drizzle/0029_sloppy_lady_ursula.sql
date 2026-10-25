ALTER TABLE "votes" ADD COLUMN "ranking_at" timestamp with time zone;--> statement-breakpoint
UPDATE "votes" SET "ranking_at" = "created_at" WHERE "ranking_at" IS NULL;--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "ranking_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "ranking_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "week_listings" ADD COLUMN "final_rank" integer;--> statement-breakpoint
ALTER TABLE "week_listings" ADD COLUMN "rank_vote_count" integer;--> statement-breakpoint
ALTER TABLE "week_listings" ADD COLUMN "snapshotted_at" timestamp with time zone;--> statement-breakpoint
WITH current AS (
  SELECT
    EXTRACT(ISOYEAR FROM (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))::int AS iso_year,
    EXTRACT(WEEK FROM (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))::int AS iso_week
),
closed AS (
  SELECT wl.id, wl.iso_year, wl.iso_week, wl.game_id, g.name, g.archived_at
  FROM week_listings wl
  INNER JOIN games g ON g.id = wl.game_id
  CROSS JOIN current c
  WHERE wl.iso_year < c.iso_year
     OR (wl.iso_year = c.iso_year AND wl.iso_week < c.iso_week)
),
counts AS (
  SELECT
    c.id,
    c.iso_year,
    c.iso_week,
    c.name,
    c.archived_at,
    COUNT(v.id)::int AS rank_vote_count
  FROM closed c
  LEFT JOIN votes v
    ON v.game_id = c.game_id
   AND v.iso_year = c.iso_year
   AND v.iso_week = c.iso_week
  GROUP BY c.id, c.iso_year, c.iso_week, c.name, c.archived_at
),
ranked AS (
  SELECT
    id,
    rank_vote_count,
    CASE
      WHEN archived_at IS NULL THEN ROW_NUMBER() OVER (
        PARTITION BY iso_year, iso_week, (archived_at IS NULL)
        ORDER BY rank_vote_count DESC, name ASC
      )::int
      ELSE NULL
    END AS final_rank
  FROM counts
)
UPDATE week_listings AS wl
SET
  final_rank = ranked.final_rank,
  rank_vote_count = ranked.rank_vote_count,
  snapshotted_at = CURRENT_TIMESTAMP
FROM ranked
WHERE wl.id = ranked.id;
