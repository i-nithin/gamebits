"use server";

import { revalidatePath } from "next/cache";

import { accountBlockReason, getCurrentUserId } from "@/lib/auth-admin";
import { rateLimit } from "@/lib/rate-limit";
import { getProfileHandle } from "@/lib/profile";
import { toggleBookmark } from "@/lib/queries";

export async function toggleBookmarkAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const blocked = await accountBlockReason(userId);
  if (!userId || blocked) return { ok: false as const, reason: blocked ?? "unauthenticated" };
  if ((await rateLimit("bookmark", userId)) !== "ok") {
    return { ok: false as const, reason: "limited" as const };
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
