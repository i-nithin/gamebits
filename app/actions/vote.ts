"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserId } from "@/lib/auth-admin";
import { isIsoWeekLive } from "@/lib/iso-week";
import { toggleWeekVote } from "@/lib/queries";

export async function toggleVoteAction(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false as const, reason: "unauthenticated" as const };
  }

  const gameId = String(formData.get("gameId") ?? "");
  const year = Number(formData.get("year"));
  const week = Number(formData.get("week"));

  if (!gameId || !Number.isInteger(year) || !Number.isInteger(week)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (!isIsoWeekLive(year, week)) {
    return { ok: false as const, reason: "frozen" as const };
  }

  await toggleWeekVote({ userId, gameId, year, week });
  revalidatePath("/");
  revalidatePath(`/week/${year}/${week}`);
  revalidatePath("/games", "layout");
  return { ok: true as const };
}
