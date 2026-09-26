"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth-admin";
import { getProfileHandle } from "@/lib/profile";
import { toggleBookmark } from "@/lib/queries";

export async function toggleBookmarkAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const result = await toggleBookmark({ userId, gameId });
  if (!result) {
    return { ok: false as const, reason: "invalid" as const };
  }

  revalidatePath("/bookmarks");
  revalidatePath(`/games/${result.slug}`);
  const handle = await getProfileHandle(userId);
  if (handle) revalidatePath(`/u/${handle}`);
  return { ok: true as const, bookmarked: result.bookmarked };
}
