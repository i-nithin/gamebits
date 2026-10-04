"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { profiles } from "@/db/schema";
import { createAdOrder, cancelAdOrder, getAdOrderForEdit, isAdImageUrl, removeAdOrder, removeAdSlot, reviewAdOrder, updateAdCreative } from "@/lib/ads";
import { monthKey, parseMonthKey } from "@/lib/ads-month";
import { getCurrentUserId, isAccountClosed, requireAdmin } from "@/lib/auth-admin";
import { AD_NAME_MAX, AD_SLOT_CAP, AD_TAGLINE_MAX } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { isUuid, sanitizePlainText } from "@/lib/sanitize";

const creativeSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  format: z.enum(["brand", "media"]),
  slotCount: z.number().int().min(1).max(AD_SLOT_CAP),
  destinationUrl: z.string().max(2000),
  logoUrl: z.string().max(2000).nullable(),
  productName: z.string().max(80).nullable(),
  tagline: z.string().max(160).nullable(),
  mediaUrl: z.string().max(2000).nullable(),
});

function revalidateAds() {
  revalidatePath("/");
  revalidatePath("/adbits");
  revalidatePath("/4dm1n/adbits");
}

function httpsDestination(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function requireBooker() {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) {
    return { ok: false as const, error: "Sign in to book an ad" };
  }
  const db = getDb();
  const [profile] = await db
    .select({ clerkUserId: profiles.clerkUserId })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  if (!profile) {
    return { ok: false as const, error: "Finish your profile before booking an ad" };
  }
  return { ok: true as const, userId };
}

function imageAllowed(url: string, userIds: string[]) {
  return userIds.some((userId) => isAdImageUrl(url, userId));
}

function normalizeCreative(
  input: z.infer<typeof creativeSchema>,
  userId: string | string[],
) {
  const imageOwners = Array.isArray(userId) ? userId : [userId];
  const destinationUrl = httpsDestination(input.destinationUrl);
  if (!destinationUrl) {
    return { ok: false as const, error: "Use an https link for the click destination" };
  }

  if (input.format === "brand") {
    const productName = sanitizePlainText(input.productName ?? "", AD_NAME_MAX);
    const tagline = sanitizePlainText(input.tagline ?? "", AD_TAGLINE_MAX);
    const logoUrl = input.logoUrl?.trim() ?? "";
    if (!productName || !tagline || !logoUrl || !imageAllowed(logoUrl, imageOwners)) {
      return { ok: false as const, error: "Add a logo, product name, and tagline" };
    }
    return {
      ok: true as const,
      creative: {
        format: "brand" as const,
        year: input.year,
        month: input.month,
        slotCount: input.slotCount,
        destinationUrl,
        logoUrl,
        productName,
        tagline,
        mediaUrl: null,
      },
    };
  }

  const mediaUrl = input.mediaUrl?.trim() ?? "";
  if (!mediaUrl || !imageAllowed(mediaUrl, imageOwners)) {
    return { ok: false as const, error: "Upload an image or GIF" };
  }
  return {
    ok: true as const,
    creative: {
      format: "media" as const,
      year: input.year,
      month: input.month,
      slotCount: input.slotCount,
      destinationUrl,
      logoUrl: null,
      productName: null,
      tagline: null,
      mediaUrl,
    },
  };
}

function readCreativeForm(formData: FormData) {
  const month = parseMonthKey(String(formData.get("monthKey") ?? ""));
  if (!month) return null;
  const slotCount = Number.parseInt(String(formData.get("slotCount") ?? "1"), 10);
  return {
    year: month.year,
    month: month.month,
    format: String(formData.get("format") ?? ""),
    slotCount: Number.isInteger(slotCount) ? slotCount : 0,
    destinationUrl: String(formData.get("destinationUrl") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? "") || null,
    productName: String(formData.get("productName") ?? "") || null,
    tagline: String(formData.get("tagline") ?? "") || null,
    mediaUrl: String(formData.get("mediaUrl") ?? "") || null,
  };
}

export async function bookAdFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const booker = await requireBooker();
  if (!booker.ok) return { error: booker.error };

  const input = readCreativeForm(formData);
  if (!input) return { error: "Choose a month" };
  const parsed = creativeSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = normalizeCreative(parsed.data, booker.userId);
  if (!creative.ok) return { error: creative.error };

  const created = await createAdOrder({
    ownerClerkUserId: booker.userId,
    creative: creative.creative,
    status: "pending",
    reviewedByClerkUserId: null,
  });
  if (!created.ok) return { error: created.error };

  revalidateAds();
  redirect("/adbits");
}

export async function placeAdminAdFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const adminId = await requireAdmin();

  const input = readCreativeForm(formData);
  if (!input) return { error: "Choose a month" };
  const parsed = creativeSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = normalizeCreative(parsed.data, adminId);
  if (!creative.ok) return { error: creative.error };

  const created = await createAdOrder({
    ownerClerkUserId: adminId,
    creative: creative.creative,
    status: "approved",
    reviewedByClerkUserId: adminId,
  });
  if (!created.ok) return { error: created.error };

  revalidateAds();
  redirect(`/4dm1n/adbits?month=${monthKey(creative.creative)}`);
}

async function saveAdCreative(
  formData: FormData,
  actorId: string,
  asAdmin: boolean,
): Promise<{ error: string } | { order: NonNullable<Awaited<ReturnType<typeof getAdOrderForEdit>>> }> {
  const orderId = String(formData.get("orderId") ?? "");
  if (!isUuid(orderId)) return { error: "Booking not found" };

  const order = await getAdOrderForEdit(orderId);
  if (!order || (!asAdmin && order.ownerClerkUserId !== actorId)) {
    return { error: "Booking not found" };
  }
  if (!order.editable) return { error: "This booking can no longer be edited" };

  const input = {
    year: order.year,
    month: order.month,
    format: String(formData.get("format") ?? ""),
    slotCount: order.slotCount,
    destinationUrl: String(formData.get("destinationUrl") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? "") || null,
    productName: String(formData.get("productName") ?? "") || null,
    tagline: String(formData.get("tagline") ?? "") || null,
    mediaUrl: String(formData.get("mediaUrl") ?? "") || null,
  };
  const parsed = creativeSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = normalizeCreative(parsed.data, [order.ownerClerkUserId, actorId]);
  if (!creative.ok) return { error: creative.error };

  const updated = await updateAdCreative(orderId, creative.creative);
  if (!updated.ok) return { error: updated.error };
  revalidateAds();
  return { order };
}

export async function saveOwnedAdFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const booker = await requireBooker();
  if (!booker.ok) return { error: booker.error };
  const saved = await saveAdCreative(formData, booker.userId, false);
  if ("error" in saved) return saved;
  redirect("/adbits");
}

export async function saveAdminAdFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const adminId = await requireAdmin();
  const saved = await saveAdCreative(formData, adminId, true);
  if ("error" in saved) return saved;
  redirect(`/4dm1n/adbits?month=${monthKey(saved.order)}`);
}

export async function cancelAdOrderAction(orderId: string) {
  const booker = await requireBooker();
  if (!booker.ok) return booker;
  if (!isUuid(orderId)) return { ok: false as const, error: "Booking not found" };
  const result = await cancelAdOrder(booker.userId, orderId);
  if (result.ok) revalidateAds();
  return result;
}

export async function approveAdOrderAction(orderId: string) {
  const adminId = await requireAdmin();
  if (!isUuid(orderId)) return { ok: false as const, error: "Booking not found" };
  const result = await reviewAdOrder(adminId, orderId, "approved");
  if (result.ok) revalidateAds();
  return result;
}

export async function rejectAdOrderAction(orderId: string) {
  const adminId = await requireAdmin();
  if (!isUuid(orderId)) return { ok: false as const, error: "Booking not found" };
  const result = await reviewAdOrder(adminId, orderId, "rejected");
  if (result.ok) revalidateAds();
  return result;
}

export async function removeAdSlotAction(slotId: string) {
  await requireAdmin();
  if (!isUuid(slotId)) return { ok: false as const, error: "Slot not found" };
  const result = await removeAdSlot(slotId);
  if (result.ok) revalidateAds();
  return result;
}

export async function removeAdOrderAction(orderId: string) {
  await requireAdmin();
  if (!isUuid(orderId)) return { ok: false as const, error: "Booking not found" };
  const result = await removeAdOrder(orderId);
  if (result.ok) revalidateAds();
  return result;
}
