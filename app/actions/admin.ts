"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { games, weekListings } from "@/db/schema";
import { GAME_STATUSES, WEEK_LISTING_CAP } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { countWeekListings, getGameById } from "@/lib/queries";

const gameSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  tagline: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  coverUrl: z.string().url(),
  trailerUrl: z.string().url().optional().or(z.literal("")),
  developerName: z.string().min(1).max(120),
  primaryUrl: z.string().url(),
  status: z.enum(GAME_STATUSES),
  tags: z.string(),
  platforms: z.array(z.string()).min(1),
});

function parseTags(raw: string) {
  const tags = raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (tags.length < 1) {
    throw new Error("Add 1–3 tags");
  }
  return tags;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function upsertGameAction(formData: FormData) {
  await requireAdmin();
  const platforms = formData.getAll("platforms").map(String);
  const parsed = gameSchema.parse({
    id: formData.get("id") ? String(formData.get("id")) : undefined,
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? "") || slugify(String(formData.get("name") ?? "")),
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    coverUrl: String(formData.get("coverUrl") ?? ""),
    trailerUrl: String(formData.get("trailerUrl") ?? ""),
    developerName: String(formData.get("developerName") ?? ""),
    primaryUrl: String(formData.get("primaryUrl") ?? ""),
    status: String(formData.get("status") ?? "upcoming"),
    tags: String(formData.get("tags") ?? ""),
    platforms,
  });

  const tags = parseTags(parsed.tags);
  const db = getDb();
  const values = {
    name: parsed.name,
    slug: parsed.slug,
    tagline: parsed.tagline,
    description: parsed.description,
    coverUrl: parsed.coverUrl,
    trailerUrl: parsed.trailerUrl || null,
    developerName: parsed.developerName,
    primaryUrl: parsed.primaryUrl,
    status: parsed.status,
    tags,
    platforms: parsed.platforms,
    updatedAt: new Date(),
  };

  let id = parsed.id;
  if (id) {
    await db.update(games).set(values).where(eq(games.id, id));
  } else {
    const [created] = await db.insert(games).values(values).returning({ id: games.id });
    id = created.id;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/games/${id}`);
}

export async function assignWeekAction(formData: FormData) {
  await requireAdmin();
  const gameId = String(formData.get("gameId") ?? "");
  const year = Number(formData.get("year"));
  const week = Number(formData.get("week"));
  const featured = formData.get("featured") === "on";

  if (!gameId || !Number.isInteger(year) || !Number.isInteger(week)) {
    throw new Error("Invalid week assignment");
  }

  const game = await getGameById(gameId);
  if (!game) throw new Error("Game not found");

  const db = getDb();
  const existing = await db
    .select({ id: weekListings.id })
    .from(weekListings)
    .where(
      and(
        eq(weekListings.gameId, gameId),
        eq(weekListings.isoYear, year),
        eq(weekListings.isoWeek, week),
      ),
    )
    .limit(1);

  if (!existing[0]) {
    const count = await countWeekListings(year, week);
    if (count >= WEEK_LISTING_CAP) {
      throw new Error(`This week already has ${WEEK_LISTING_CAP} games`);
    }
    await db.insert(weekListings).values({
      gameId,
      isoYear: year,
      isoWeek: week,
      featured,
    });
  } else {
    await db
      .update(weekListings)
      .set({ featured })
      .where(eq(weekListings.id, existing[0].id));
  }

  revalidatePath("/");
  revalidatePath(`/week/${year}/${week}`);
  revalidatePath(`/games/${game.slug}`);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function removeWeekListingAction(formData: FormData) {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) throw new Error("Missing listing");
  const db = getDb();
  await db.delete(weekListings).where(eq(weekListings.id, listingId));
  revalidatePath("/");
  revalidatePath("/admin");
}
