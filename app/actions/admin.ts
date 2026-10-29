"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { profiles, weekListings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { getGameById, placeGameOnWeek } from "@/lib/queries";

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

  const placed = await placeGameOnWeek({ gameId, year, week, featured });
  if (!placed.ok) throw new Error(placed.error);

  revalidatePath("/");
  revalidatePath(`/week/${year}/${week}`);
  revalidatePath(`/games/${game.slug}`);
  revalidatePath("/4dm1n");
  revalidatePath(`/4dm1n/games/${gameId}`);
  redirect(`/4dm1n/games/${gameId}`);
}

const clerkUserIdPattern = /^user_[A-Za-z0-9]+$/;

export async function setSuperAdminAction(formData: FormData) {
  await requireAdmin();
  const clerkUserId = String(formData.get("clerkUserId") ?? "");
  const next = formData.get("superAdmin") === "true";
  if (!clerkUserIdPattern.test(clerkUserId)) {
    throw new Error("Invalid user");
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ superAdmin: profiles.superAdmin, deletedAt: profiles.deletedAt })
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1);
    if (!row) throw new Error("Invalid user");
    if (row.deletedAt) throw new Error("This account is closed");
    if (!next && row.superAdmin) {
      const admins = await tx
        .select({ clerkUserId: profiles.clerkUserId })
        .from(profiles)
        .where(and(eq(profiles.superAdmin, true), isNull(profiles.deletedAt)))
        .for("update");
      if (admins.length <= 1) {
        throw new Error("Cannot remove the last admin");
      }
    }

    await tx
      .update(profiles)
      .set({ superAdmin: next, updatedAt: new Date() })
      .where(and(eq(profiles.clerkUserId, clerkUserId), isNull(profiles.deletedAt)));
  });

  revalidatePath("/4dm1n");
  revalidatePath("/", "layout");
}

export async function removeWeekListingAction(formData: FormData) {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) throw new Error("Missing listing");
  const db = getDb();
  await db.delete(weekListings).where(eq(weekListings.id, listingId));
  revalidatePath("/");
  revalidatePath("/4dm1n");
}
