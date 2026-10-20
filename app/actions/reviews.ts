"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { gameReviews, games } from "@/db/schema";
import { accountAccessError, getCurrentUserId } from "@/lib/auth-admin";
import { REVIEW_BODY_MAX } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { ensureCurrentProfile, getProfileHandle } from "@/lib/profile";
import { sanitizeMultiline, sanitizePlainText } from "@/lib/sanitize";

const reviewSchema = z.object({
  gameId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().min(1).max(REVIEW_BODY_MAX),
});

export async function upsertReviewAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) throw new Error(blocked ?? "Sign in to continue");
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

  const profile = await ensureCurrentProfile();
  if (!profile || profile.clerkUserId !== userId || profile.deletedAt) {
    throw new Error("Sign in to continue");
  }
  const displayName = sanitizePlainText(profile.name, 80) || "Player";
  const imageUrl = profile.imageUrl;

  const [existing] = await db
    .select({ id: gameReviews.id, removedAt: gameReviews.removedAt })
    .from(gameReviews)
    .where(and(eq(gameReviews.gameId, game.id), eq(gameReviews.clerkUserId, userId)))
    .limit(1);
  if (existing?.removedAt) throw new Error("This comment was removed");

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
  const handle = await getProfileHandle(userId);
  if (handle) revalidatePath(`/u/${handle}`);
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

export async function deleteReviewAction(
  reviewId: string,
): Promise<{ error: string } | { ok: true }> {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) return { error: blocked ?? "Sign in to continue." };
  if (!z.string().uuid().safeParse(reviewId).success) {
    return { error: "Comment not found." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: gameReviews.id, slug: games.slug })
    .from(gameReviews)
    .innerJoin(games, eq(gameReviews.gameId, games.id))
    .where(and(eq(gameReviews.id, reviewId), eq(gameReviews.clerkUserId, userId)))
    .limit(1);
  if (!existing) return { error: "Comment not found." };

  await db.delete(gameReviews).where(eq(gameReviews.id, existing.id));
  revalidatePath(`/games/${existing.slug}`);
  const handle = await getProfileHandle(userId);
  if (handle) revalidatePath(`/u/${handle}`);
  return { ok: true };
}
