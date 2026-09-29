"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addStaffMember,
  isStaffRole,
  removeStaffMember,
  requireStaff,
  updateStaffRole,
} from "@gamebits/auth";
import { setCategoryArchived, setPlatformArchived, upsertCategory, upsertPlatform } from "@gamebits/core/catalog";
import { setGameArchived, upsertGame } from "@gamebits/core/games";
import { findProfileByHandle, setProfileSuspended } from "@gamebits/core/users";
import { assignWeekListing, removeWeekListing } from "@gamebits/core/week";

function fail(error: unknown): { error: string } {
  return { error: error instanceof Error ? error.message : "Something went wrong" };
}

export async function saveGameAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const { userId } = await requireStaff("editor");
  const result = await upsertGame(userId, formData);
  if (!result.ok) return { error: result.error };
  revalidatePath("/games");
  revalidatePath("/");
  redirect(`/games/${result.id}`);
}

export async function archiveGameAction(formData: FormData) {
  const { userId } = await requireStaff("editor");
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  await setGameArchived(userId, id, archived);
  revalidatePath("/games");
  revalidatePath(`/games/${id}`);
  revalidatePath("/week");
}

export async function assignWeekAction(formData: FormData) {
  await requireStaff("editor");
  const gameId = String(formData.get("gameId") ?? "");
  const year = Number(formData.get("year"));
  const week = Number(formData.get("week"));
  const featured = formData.get("featured") === "on";
  await assignWeekListing({ gameId, year, week, featured });
  revalidatePath("/week");
  revalidatePath("/");
  revalidatePath(`/games/${gameId}`);
}

export async function removeWeekAction(formData: FormData) {
  await requireStaff("editor");
  await removeWeekListing(String(formData.get("listingId") ?? ""));
  revalidatePath("/week");
  revalidatePath("/");
}

export async function savePlatformAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  await requireStaff("editor");
  const error = await upsertPlatform(formData);
  if (error) return error;
  revalidatePath("/platforms");
  redirect("/platforms");
}

export async function archivePlatformAction(formData: FormData) {
  await requireStaff("editor");
  await setPlatformArchived(String(formData.get("id") ?? ""), formData.get("archived") === "true");
  revalidatePath("/platforms");
}

export async function saveCategoryAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  await requireStaff("editor");
  const error = await upsertCategory(formData);
  if (error) return error;
  revalidatePath("/categories");
  redirect("/categories");
}

export async function archiveCategoryAction(formData: FormData) {
  await requireStaff("editor");
  try {
    await setCategoryArchived(
      String(formData.get("id") ?? ""),
      formData.get("archived") === "true",
    );
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Could not archive");
  }
  revalidatePath("/categories");
}

export async function suspendUserAction(formData: FormData) {
  await requireStaff("admin");
  await setProfileSuspended(
    String(formData.get("clerkUserId") ?? ""),
    formData.get("suspended") === "true",
  );
  revalidatePath("/users");
}

export async function saveStaffAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    const { userId } = await requireStaff("owner");
    const handle = String(formData.get("handle") ?? "");
    const role = String(formData.get("role") ?? "");
    if (!isStaffRole(role)) return { error: "Pick a role" };
    const profile = await findProfileByHandle(handle);
    if (!profile) return { error: "No profile with that handle" };
    await addStaffMember(userId, profile.clerkUserId, role);
    revalidatePath("/staff");
    return null;
  } catch (error) {
    return fail(error);
  }
}

export async function changeStaffRoleAction(formData: FormData) {
  const { userId } = await requireStaff("owner");
  const role = String(formData.get("role") ?? "");
  if (!isStaffRole(role)) throw new Error("Invalid role");
  await updateStaffRole(userId, String(formData.get("clerkUserId") ?? ""), role);
  revalidatePath("/staff");
}

export async function removeStaffAction(formData: FormData) {
  const { userId } = await requireStaff("owner");
  await removeStaffMember(userId, String(formData.get("clerkUserId") ?? ""));
  revalidatePath("/staff");
}
