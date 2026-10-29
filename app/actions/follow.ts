"use server";

import { revalidatePath } from "next/cache";

import { accountBlockReason, getCurrentUserId } from "@/lib/auth-admin";
import { ensureCurrentProfile, getProfileByHandle, HANDLE_RE } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";
import {
  emitDirectNotification,
  ensureActorPayload,
} from "@/lib/notifications";
import { toggleFollow } from "@/lib/queries";

export async function toggleFollowAction(formData: FormData) {
  const userId = await getCurrentUserId();
  const blocked = await accountBlockReason(userId);
  if (!userId || blocked) return { ok: false as const, reason: blocked ?? "unauthenticated" };

  const handle = String(formData.get("handle") ?? "").toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return { ok: false as const, reason: "invalid" as const };
  }
  if ((await rateLimit("follow", userId)) !== "ok") {
    return { ok: false as const, reason: "limited" as const };
  }

  const follower = await ensureCurrentProfile();
  if (!follower || follower.deletedAt || follower.bannedAt || follower.clerkUserId !== userId) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }

  const target = await getProfileByHandle(handle);
  if (!target || target.clerkUserId === userId) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const result = await toggleFollow({ followerId: userId, followingId: target.clerkUserId });
  if (!result) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (result.following) {
    const actor = await ensureActorPayload(userId);
    void emitDirectNotification({
      recipientId: target.clerkUserId,
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
