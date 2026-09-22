"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gameReviews, games } from "@/db/schema";
import { requireSignedIn } from "@/lib/auth-admin";
import { REVIEW_BODY_MAX } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { sanitizeMultiline } from "@/lib/sanitize";

const reviewSchema = z.object({
  gameId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().min(1).max(REVIEW_BODY_MAX),
});

export async function upsertReviewAction(formData: FormData) {
  const userId = await requireSignedIn();
  const parsed = reviewSchema.parse({
    gameId: String(formData.get("gameId") ?? ""),
    rating: String(formData.get("rating") ?? ""),
    body: sanitizeMultiline(String(formData.get("body") ?? ""), REVIEW_BODY_MAX),
  });

  if (!parsed.body) {
    throw new Error("Write a short comment");
  }

  const db = getDb();
  const [game] = await db
    .select({
      id: games.id,
      slug: games.slug,
      archivedAt: games.archivedAt,
    })
    .from(games)
    .where(eq(games.id, parsed.gameId))
    .limit(1);

  if (!game || game.archivedAt) {
    throw new Error("Game not found");
  }

  const displayName = sanitizeMultiline(
    String(formData.get("displayName") ?? "Player"),
    80,
  ) || "Player";
  const imageUrlRaw = String(formData.get("imageUrl") ?? "");
  let imageUrl: string | null = null;
  try {
    const parsed = new URL(imageUrlRaw);
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "img.clerk.com" || parsed.hostname.endsWith(".clerk.com"))
    ) {
      imageUrl = parsed.toString().slice(0, 500);
    }
  } catch {
    imageUrl = null;
  }

  const [existing] = await db
    .select({ id: gameReviews.id })
    .from(gameReviews)
    .where(and(eq(gameReviews.gameId, game.id), eq(gameReviews.clerkUserId, userId)))
    .limit(1);

  const now = new Date();
  let reviewId = existing?.id;
  if (existing) {
    await db
      .update(gameReviews)
      .set({
        rating: parsed.rating,
        body: parsed.body,
        displayName,
        imageUrl,
        updatedAt: now,
      })
      .where(eq(gameReviews.id, existing.id));
  } else {
    const [created] = await db
      .insert(gameReviews)
      .values({
        gameId: game.id,
        clerkUserId: userId,
        displayName,
        imageUrl,
        rating: parsed.rating,
        body: parsed.body,
      })
      .returning({ id: gameReviews.id, createdAt: gameReviews.createdAt });
    reviewId = created.id;
  }

  revalidatePath(`/games/${game.slug}`);
  return {
    review: {
      id: reviewId!,
      rating: parsed.rating,
      body: parsed.body,
      displayName,
      imageUrl,
      createdAt: now.toISOString(),
      clerkUserId: userId,
    },
  };
}
