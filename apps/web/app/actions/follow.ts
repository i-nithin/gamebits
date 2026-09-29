"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth-admin";
import { isProfileSuspended } from "@gamebits/core/users";
import { ensureCurrentProfile } from "@/lib/profile";
import {
  emitDirectNotification,
  ensureActorPayload,
} from "@/lib/notifications";
import { toggleFollow } from "@/lib/queries";

export async function toggleFollowAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }
  if (await isProfileSuspended(userId)) {
    return { ok: false as const, reason: "invalid" as const };
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

  if (result.following) {
    const actor = await ensureActorPayload(userId);
    void emitDirectNotification({
      recipientId: profileUserId,
      actorId: userId,
      type: "follow",
      entityType: "profile",
      entityId: userId,
      groupKey: `follow:${userId}`,
      payload: actor,
      aggregate: false,
    }).catch((error) => console.error("[notifications] follow emit failed", error));
  }

  revalidatePath(`/u/${result.targetHandle}`);
  if (follower?.handle) revalidatePath(`/u/${follower.handle}`);
  return { ok: true as const, following: result.following };
}
