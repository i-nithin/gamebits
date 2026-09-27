"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth-admin";
import { ensureCurrentProfile } from "@/lib/profile";
import { toggleFollow } from "@/lib/queries";

export async function toggleFollowAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }

  const profileUserId = String(formData.get("profileUserId") ?? "");
  if (!profileUserId || profileUserId === userId) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const [result, follower] = await Promise.all([
    toggleFollow({ followerId: userId, followingId: profileUserId }),
    ensureCurrentProfile(),
  ]);
  if (!result) {
    return { ok: false as const, reason: "invalid" as const };
  }

  revalidatePath(`/u/${result.targetHandle}`);
  if (follower?.handle) revalidatePath(`/u/${follower.handle}`);
  return { ok: true as const, following: result.following };
}
