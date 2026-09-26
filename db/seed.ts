import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { gamePlatforms, games, platforms, weekListings } from "./schema";
import { getIsoWeekUtc } from "../lib/iso-week";
import { DEFAULT_PLATFORMS, LEGACY_PLATFORM_SLUGS } from "../lib/platform-catalog";

config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to seed");
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

const seedGames = [
  {
    slug: "northstar-drift",
    name: "Northstar Drift",
    tagline: "A night-drive racer across frozen highways.",
    description:
      "Pilot a silent coupe through aurora-lit interstates. Time trials, ghost cars, and a radio that only plays after midnight.",
    coverUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80",
    logoUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    developerName: "Icebox Works",
    primaryUrl: "https://example.com/northstar-drift",
    status: "demo" as const,
    tags: ["racing", "indie"],
    platforms: ["PC", "Web"],
  },
  {
    slug: "garden-protocol",
    name: "Garden Protocol",
    tagline: "Grow a city of plants that negotiate with you.",
    description:
      "A calm systems garden where each plant is a process. Balance water, light, and rumor.",
    coverUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
    logoUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
    developerName: "Leaf Runtime",
    primaryUrl: "https://example.com/garden-protocol",
    status: "upcoming" as const,
    tags: ["sim", "cozy"],
    platforms: ["PC", "iOS"],
  },
  {
    slug: "signal-fold",
    name: "Signal Fold",
    tagline: "A stealth puzzle inside a collapsing radio tower.",
    description:
      "Fold hallways, hide in static, and extract a broadcast before the tower drops.",
    coverUrl:
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1600&q=80",
    logoUrl:
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80",
    developerName: "Null Antenna",
    primaryUrl: "https://example.com/signal-fold",
    status: "playtest" as const,
    tags: ["puzzle", "stealth"],
    platforms: ["PC"],
  },
  {
    slug: "salt-kingdom",
    name: "Salt Kingdom",
    tagline: "A tactics RPG on a drying sea.",
    description:
      "Command a salt-crusted company as the tide never returns. Permadeath, maps that crack, and markets that lie.",
    coverUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1400&q=80",
    logoUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80",
    developerName: "Brine Assembly",
    primaryUrl: "https://example.com/salt-kingdom",
    status: "early_access" as const,
    tags: ["tactics", "rpg"],
    platforms: ["PC", "Console"],
  },
  {
    slug: "orbit-kitchen",
    name: "Orbit Kitchen",
    tagline: "Cook in zero-g before the crew wakes up.",
    description:
      "A chaotic co-op kitchen where ingredients float and recipes rewrite themselves mid-shift.",
    coverUrl:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80",
    logoUrl:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
    developerName: "Galley Soft",
    primaryUrl: "https://example.com/orbit-kitchen",
    status: "released" as const,
    tags: ["co-op", "party"],
    platforms: ["PC", "Console", "Web"],
  },
];

function platformSlugsFor(names: string[]) {
  const slugs = new Set<string>();
  for (const name of names) {
    const slug = LEGACY_PLATFORM_SLUGS[name.trim().toLowerCase()];
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

async function main() {
  const { year, week } = getIsoWeekUtc();
  await db.insert(platforms).values([...DEFAULT_PLATFORMS]).onConflictDoNothing({
    target: platforms.slug,
  });
  const catalog = await db.select({ id: platforms.id, slug: platforms.slug }).from(platforms);
  const platformIdBySlug = new Map(catalog.map((row) => [row.slug, row.id]));

  const inserted = await db
    .insert(games)
    .values(seedGames.map(({ platforms: _platforms, ...game }) => game))
    .onConflictDoNothing({ target: games.slug })
    .returning({ id: games.id, slug: games.slug });

  const existing = inserted.length
    ? inserted
    : await db.select({ id: games.id, slug: games.slug }).from(games);

  const bySlug = new Map(existing.map((row) => [row.slug, row.id]));
  const listingValues = seedGames.flatMap((game, index) => {
    const id = bySlug.get(game.slug);
    if (!id) return [];
    return [
      {
        gameId: id,
        isoYear: year,
        isoWeek: week,
        featured: index < 3,
      },
    ];
  });

  const gamePlatformValues = seedGames.flatMap((game) => {
    const gameId = bySlug.get(game.slug);
    if (!gameId) return [];
    return platformSlugsFor(game.platforms).flatMap((slug) => {
      const platformId = platformIdBySlug.get(slug);
      if (!platformId) return [];
      return [{ gameId, platformId }];
    });
  });

  if (listingValues.length > 0) {
    await db.insert(weekListings).values(listingValues).onConflictDoNothing();
  }
  if (gamePlatformValues.length > 0) {
    await db.insert(gamePlatforms).values(gamePlatformValues).onConflictDoNothing({
      target: [gamePlatforms.gameId, gamePlatforms.platformId],
    });
  }

  console.log(`Seeded ${listingValues.length} listings for ISO ${year}-W${week}`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
