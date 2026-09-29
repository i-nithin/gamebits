"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUserId, requireSignedIn } from "@/lib/auth-admin";
import { setGameArchived, upsertGame } from "@gamebits/core/games";
import { isProfileSuspended } from "@gamebits/core/users";
import { ensureCurrentProfile, getProfileHandle } from "@/lib/profile";

async function revalidateOwnerProfile(
  ownerId: string | null | undefined,
  actorId: string,
) {
  if (!ownerId) return;
  const handle =
    ownerId === actorId
      ? (await ensureCurrentProfile())?.handle
      : await getProfileHandle(ownerId);
  if (handle) revalidatePath(`/u/${handle}`);
}

export async function upsertOwnedGameAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Sign in to continue" };
  if (await isProfileSuspended(userId)) return { error: "This account is suspended" };

  const result = await upsertGame(userId, formData);
  if (!result.ok) return { error: result.error };

  if (result.created) {
    const { ensureActorPayload, enqueueFollowerFanout } = await import("@/lib/notifications");
    const actor = await ensureActorPayload(userId);
    void enqueueFollowerFanout({
      type: "followee_publish",
      actorId: userId,
      entityId: result.id,
      groupKey: `followee_publish:${result.id}`,
      payload: {
        ...actor,
        gameId: result.id,
        gameName: result.name,
        gameSlug: result.slug,
        gameCoverUrl: result.coverUrl,
      },
    }).catch((error) => console.error("[notifications] publish fan-out failed", error));
  }

  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath(`/games/${result.slug}`);
  await revalidateOwnerProfile(result.ownerClerkUserId, userId);
  redirect(`/games/${result.slug}`);
}

export async function setGameArchivedAction(formData: FormData) {
  const userId = await requireSignedIn();
  if (await isProfileSuspended(userId)) throw new Error("This account is suspended");
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  const game = await setGameArchived(userId, id, archived);

  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath(`/games/${game.slug}`);
  revalidatePath(`/games/${game.slug}/edit`);
  await revalidateOwnerProfile(game.ownerClerkUserId ?? userId, userId);
}
