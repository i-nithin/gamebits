"use server";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { games, profiles } from "@/db/schema";
import { adProductId } from "@/lib/ad-catalog";
import { attachAdCheckoutSession, checkoutInFlight, getPayableAdOrder } from "@/lib/ad-payments";
import {
  cancelAdOrder,
  createAdOrder,
  createCarouselAdOrder,
  getAdOrderForEdit,
  isAdImageUrl,
  removeAdOrder,
  removeAdSlot,
  reviewAdOrder,
  updateAdCreative,
  updateCarouselCreative,
} from "@/lib/ads";
import { monthKey } from "@/lib/ads-month";
import { isCarouselVideo } from "@/lib/ads-types";
import { accountAccessError, getCurrentUserId, requireAdmin } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { confirmNewR2Object } from "@/lib/cloudflare-r2";
import {
  AD_NAME_MAX,
  AD_TAGLINE_MAX,
  CAROUSEL_BADGES,
  MAX_AD_IMAGE_BYTES,
  MAX_CAROUSEL_VIDEO_BYTES,
  type CarouselBadge,
} from "@/lib/constants";
import { getDb } from "@/lib/db";
import { createAdCheckoutSession } from "@/lib/dodo";
import { isUuid, sanitizePlainText } from "@/lib/sanitize";
import { sanitizeHttpsUrl } from "@/lib/urls";

const creativeSchema = z.object({
  format: z.enum(["brand", "media"]),
  destinationUrl: z.string().max(2000),
  logoUrl: z.string().max(2000).nullable(),
  productName: z.string().max(80).nullable(),
  tagline: z.string().max(160).nullable(),
  mediaUrl: z.string().max(2000).nullable(),
});

async function bookerBilling(userId: string) {
  const user = clerkEnabled ? await currentUser() : null;
  const clerkEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null;
  const clerkName = user?.fullName ?? user?.firstName ?? null;
  if (clerkEmail) return { email: clerkEmail, name: clerkName };

  const db = getDb();
  const [profile] = await db
    .select({ email: profiles.email, name: profiles.name })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  if (!profile?.email) return null;
  return { email: profile.email, name: clerkName ?? profile.name };
}

async function startBookingCheckout(input: {
  orderId: string;
  placement: "sidebar" | "carousel";
  quantity: number;
  userId: string;
}) {
  const billing = await bookerBilling(input.userId);
  if (!billing) {
    return { ok: false as const, error: "Add an email to your account before paying" };
  }

  if (await checkoutInFlight(input.orderId)) {
    return { ok: false as const, error: "Payment is already processing for this booking." };
  }

  try {
    const session = await createAdCheckoutSession({
      orderId: input.orderId,
      placement: input.placement,
      quantity: input.quantity,
      email: billing.email,
      name: billing.name,
    });
    await attachAdCheckoutSession(input.orderId, session.sessionId);
    return { ok: true as const, checkoutUrl: session.checkoutUrl };
  } catch (error) {
    console.error("[dodo] checkout failed", error);
    return { ok: false as const, error: "Could not start checkout. Try again." };
  }
}

function revalidateAds() {
  revalidatePath("/");
  revalidatePath("/adbits");
  revalidatePath("/adbits/sidebar");
  revalidatePath("/adbits/carousel");
  revalidatePath("/adbits/history");
  revalidatePath("/4dm1n/adbits");
}

function httpsDestination(value: string) {
  return sanitizeHttpsUrl(value);
}

async function requireBooker() {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) return { ok: false as const, error: blocked ?? "Sign in to book an ad" };
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

async function confirmAdFile(
  url: string | null,
  userIds: string[],
  maxBytes: number,
  keptUrls?: ReadonlySet<string>,
) {
  if (!url) return true;
  return confirmNewR2Object({ url, userIds, maxBytes, keptUrls });
}

function normalizeCreative(
  input: z.infer<typeof creativeSchema>,
  userId: string | string[],
) {
  const imageOwners = Array.isArray(userId) ? userId : [userId];
  const destinationUrl = httpsDestination(input.destinationUrl);
  if (!destinationUrl) {
    return { ok: false as const, error: "Use a public https link for the click destination" };
  }

  if (input.format !== "brand") {
    return { ok: false as const, error: "Sidebar ads use a logo and tagline" };
  }

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
      destinationUrl,
      logoUrl,
      productName,
      tagline,
      mediaUrl: null,
    },
  };
}

function readWeekStarts(formData: FormData) {
  return [...new Set(formData.getAll("weekKey").map((value) => String(value)))];
}

function readCreativeForm(formData: FormData) {
  return {
    format: String(formData.get("format") ?? ""),
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
  const parsed = creativeSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = normalizeCreative(parsed.data, booker.userId);
  if (!creative.ok) return { error: creative.error };
  const creativeUrl = creative.creative.logoUrl ?? creative.creative.mediaUrl;
  if (!(await confirmAdFile(creativeUrl, [booker.userId], MAX_AD_IMAGE_BYTES))) {
    return { error: "Upload a valid image" };
  }

  const created = await createAdOrder({
    ownerClerkUserId: booker.userId,
    creative: creative.creative,
    weekStarts: readWeekStarts(formData),
    status: "pending",
    reviewedByClerkUserId: null,
    payment: { status: "checkout", productId: adProductId("sidebar") },
  });
  if (!created.ok) return { error: created.error };

  const checkout = await startBookingCheckout({
    orderId: created.id,
    placement: "sidebar",
    quantity: created.weekCount,
    userId: booker.userId,
  });
  if (!checkout.ok) {
    await removeAdOrder(created.id);
    return { error: checkout.error };
  }

  revalidateAds();
  redirect(checkout.checkoutUrl);
}

export async function placeAdminAdFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const adminId = await requireAdmin();

  const input = readCreativeForm(formData);
  const parsed = creativeSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = normalizeCreative(parsed.data, adminId);
  if (!creative.ok) return { error: creative.error };
  const creativeUrl = creative.creative.logoUrl ?? creative.creative.mediaUrl;
  if (!(await confirmAdFile(creativeUrl, [adminId], MAX_AD_IMAGE_BYTES))) {
    return { error: "Upload a valid image" };
  }

  const created = await createAdOrder({
    ownerClerkUserId: adminId,
    creative: creative.creative,
    weekStarts: readWeekStarts(formData),
    status: "approved",
    reviewedByClerkUserId: adminId,
    payment: { status: "waived" },
  });
  if (!created.ok) return { error: created.error };

  revalidateAds();
  redirect(`/4dm1n/adbits?month=${monthKey(created)}`);
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

  const input = readCreativeForm(formData);
  const parsed = creativeSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = normalizeCreative(parsed.data, [order.ownerClerkUserId, actorId]);
  if (!creative.ok) return { error: creative.error };
  const kept = new Set([order.logoUrl, order.mediaUrl].filter((url): url is string => Boolean(url)));
  const creativeUrl = creative.creative.logoUrl ?? creative.creative.mediaUrl;
  if (
    !(await confirmAdFile(creativeUrl, [order.ownerClerkUserId, actorId], MAX_AD_IMAGE_BYTES, kept))
  ) {
    return { error: "Upload a valid image" };
  }

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
  redirect("/adbits/history");
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

export async function continueAdCheckoutAction(orderId: string) {
  const booker = await requireBooker();
  if (!booker.ok) return { ok: false as const, error: booker.error };
  if (!isUuid(orderId)) return { ok: false as const, error: "Booking not found" };

  const order = await getPayableAdOrder(booker.userId, orderId);
  if (!order) {
    return { ok: false as const, error: "That booking is no longer waiting for payment" };
  }

  const checkout = await startBookingCheckout({
    orderId: order.id,
    placement: order.placement,
    quantity: order.quantity,
    userId: booker.userId,
  });
  if (!checkout.ok) return checkout;

  revalidateAds();
  redirect(checkout.checkoutUrl);
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

const carouselSchema = z.object({
  gameId: z.string().uuid(),
  destinationUrl: z.string().max(2000),
  tagline: z.string().max(160).nullable(),
  mediaUrl: z.string().min(1).max(2000),
  badge: z.enum(CAROUSEL_BADGES).nullable(),
  countdownEndsAt: z.string().nullable(),
});

function readCarouselForm(formData: FormData) {
  const badgeRaw = String(formData.get("badge") ?? "");
  const countdownRaw = String(formData.get("countdownEndsAt") ?? "").trim();
  return {
    gameId: String(formData.get("gameId") ?? ""),
    destinationUrl: String(formData.get("destinationUrl") ?? ""),
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    mediaUrl: String(formData.get("mediaUrl") ?? "").trim(),
    badge: badgeRaw || null,
    countdownEndsAt: countdownRaw || null,
  };
}

async function normalizeCarousel(
  input: z.infer<typeof carouselSchema>,
  actorId: string,
  imageOwners: string[],
  asAdmin: boolean,
  keptUrls?: ReadonlySet<string>,
) {
  const destinationUrl = httpsDestination(input.destinationUrl);
  if (!destinationUrl) {
    return { ok: false as const, error: "Use a public https link for the click destination" };
  }
  const tagline = input.tagline ? sanitizePlainText(input.tagline, AD_TAGLINE_MAX) : null;
  if (input.tagline && !tagline) {
    return { ok: false as const, error: "Tagline is too long" };
  }
  if (!isCarouselVideo(input.mediaUrl) || !imageAllowed(input.mediaUrl, imageOwners)) {
    return { ok: false as const, error: "Upload an MP4 or WebM video" };
  }
  if (
    !(await confirmAdFile(
      input.mediaUrl,
      imageOwners,
      MAX_CAROUSEL_VIDEO_BYTES,
      keptUrls,
    ))
  ) {
    return { ok: false as const, error: "Upload an MP4 or WebM video" };
  }

  let countdownEndsAt: Date | null = null;
  if (input.countdownEndsAt) {
    const parsed = new Date(input.countdownEndsAt);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false as const, error: "Choose a valid countdown time" };
    }
    countdownEndsAt = parsed;
  }

  const db = getDb();
  const [game] = await db
    .select({
      id: games.id,
      ownerClerkUserId: games.ownerClerkUserId,
      iarcRating: games.iarcRating,
    })
    .from(games)
    .where(and(eq(games.id, input.gameId), isNull(games.archivedAt)))
    .limit(1);
  if (!game) return { ok: false as const, error: "Choose a game" };
  if (!game.iarcRating) {
    return { ok: false as const, error: "Add an IARC rating to this game first" };
  }
  if (!asAdmin && game.ownerClerkUserId !== actorId) {
    return { ok: false as const, error: "Choose one of your games" };
  }

  return {
    ok: true as const,
    creative: {
      destinationUrl,
      tagline,
      mediaUrl: input.mediaUrl,
      gameId: game.id,
      badge: input.badge as CarouselBadge | null,
      countdownEndsAt,
    },
  };
}

export async function bookCarouselFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const booker = await requireBooker();
  if (!booker.ok) return { error: booker.error };

  const input = readCarouselForm(formData);
  const parsed = carouselSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = await normalizeCarousel(parsed.data, booker.userId, [booker.userId], false);
  if (!creative.ok) return { error: creative.error };

  const created = await createCarouselAdOrder({
    ownerClerkUserId: booker.userId,
    weekStarts: readWeekStarts(formData),
    ...creative.creative,
    status: "pending",
    reviewedByClerkUserId: null,
    payment: { status: "checkout", productId: adProductId("carousel") },
  });
  if (!created.ok) return { error: created.error };

  const checkout = await startBookingCheckout({
    orderId: created.id,
    placement: "carousel",
    quantity: created.weekCount,
    userId: booker.userId,
  });
  if (!checkout.ok) {
    await removeAdOrder(created.id);
    return { error: checkout.error };
  }

  revalidateAds();
  redirect(checkout.checkoutUrl);
}

export async function placeAdminCarouselFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const adminId = await requireAdmin();

  const input = readCarouselForm(formData);
  const parsed = carouselSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const creative = await normalizeCarousel(parsed.data, adminId, [adminId], true);
  if (!creative.ok) return { error: creative.error };

  const created = await createCarouselAdOrder({
    ownerClerkUserId: adminId,
    weekStarts: readWeekStarts(formData),
    ...creative.creative,
    status: "approved",
    reviewedByClerkUserId: adminId,
    payment: { status: "waived" },
  });
  if (!created.ok) return { error: created.error };

  revalidateAds();
  redirect(`/4dm1n/adbits?placement=carousel&month=${monthKey(created)}`);
}

async function saveCarouselCreative(
  formData: FormData,
  actorId: string,
  asAdmin: boolean,
): Promise<{ error: string } | { order: NonNullable<Awaited<ReturnType<typeof getAdOrderForEdit>>> }> {
  const orderId = String(formData.get("orderId") ?? "");
  if (!isUuid(orderId)) return { error: "Booking not found" };

  const order = await getAdOrderForEdit(orderId);
  if (!order || order.placement !== "carousel" || (!asAdmin && order.ownerClerkUserId !== actorId)) {
    return { error: "Booking not found" };
  }
  if (!order.editable) return { error: "This booking can no longer be edited" };

  const input = readCarouselForm(formData);
  const parsed = carouselSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the ad details and try again" };
  const kept = new Set(order.mediaUrl ? [order.mediaUrl] : []);
  const creative = await normalizeCarousel(
    parsed.data,
    actorId,
    [order.ownerClerkUserId, actorId],
    asAdmin,
    kept,
  );
  if (!creative.ok) return { error: creative.error };

  const updated = await updateCarouselCreative(orderId, creative.creative);
  if (!updated.ok) return { error: updated.error };
  revalidateAds();
  return { order };
}

export async function saveOwnedCarouselFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const booker = await requireBooker();
  if (!booker.ok) return { error: booker.error };
  const saved = await saveCarouselCreative(formData, booker.userId, false);
  if ("error" in saved) return saved;
  redirect("/adbits/history");
}

export async function saveAdminCarouselFormAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const adminId = await requireAdmin();
  const saved = await saveCarouselCreative(formData, adminId, true);
  if ("error" in saved) return saved;
  redirect(`/4dm1n/adbits?placement=carousel&month=${monthKey(saved.order)}`);
}
