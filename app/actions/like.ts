"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth-admin";
import { getProfileHandle } from "@/lib/profile";
import { toggleLike } from "@/lib/queries";

export async function toggleLikeAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const result = await toggleLike({ userId, gameId });
  if (!result) {
    return { ok: false as const, reason: "invalid" as const };
  }

  revalidatePath(`/games/${result.slug}`);
  const handle = await getProfileHandle(userId);
  if (handle) revalidatePath(`/u/${handle}`);
  return { ok: true as const, liked: result.liked, likeCount: result.likeCount };
}
