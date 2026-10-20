"use server";

import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { profiles } from "@/db/schema";
import { accountAccessError, getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { confirmNewR2Object } from "@/lib/cloudflare-r2";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { isCountryCode } from "@/lib/countries";
import { HANDLE_RE, ensureCurrentProfile } from "@/lib/profile";
import { sanitizeMultiline, sanitizePlainText } from "@/lib/sanitize";
import {
  isProfileImageUrl,
  sanitizeProfileLink,
  type ProfileLinkKind,
} from "@/lib/urls";

const identitySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  handle: z.string().regex(HANDLE_RE, "Use 3–30 letters, numbers, or underscores"),
  headline: z.string().max(140),
  bio: z.string().max(500),
  city: z.string().max(80),
});

const LINK_FIELDS: Array<{ key: ProfileLinkKind; field: string; label: string }> = [
  { key: "website", field: "websiteUrl", label: "personal site" },
  { key: "x", field: "xUrl", label: "X" },
  { key: "github", field: "githubUrl", label: "GitHub" },
  { key: "linkedin", field: "linkedinUrl", label: "LinkedIn" },
  { key: "reddit", field: "redditUrl", label: "Reddit" },
];

function blankToNull(value: string) {
  return value ? value : null;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === "23505") return true;
  if ("cause" in error) return isUniqueViolation((error as { cause: unknown }).cause);
  return false;
}

function optionalImage(
  raw: string,
  userId: string,
  current: string | null,
  clerkImageUrl: string | null,
): { url: string | null } | { error: string } {
  const text = sanitizePlainText(raw, 500);
  if (!text) return { url: null };
  if (text === current || isProfileImageUrl(text, userId, clerkImageUrl)) return { url: text };
  return { error: "Use an uploaded image" };
}

type ProfileActionState = { error: string } | { saved: true } | null;

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) return { error: blocked ?? "Sign in to continue" };

  const existing = await ensureCurrentProfile();
  if (!existing || existing.clerkUserId !== userId || existing.deletedAt || existing.bannedAt) {
    return { error: existing?.bannedAt ? "This account is banned" : "Sign in to continue" };
  }

  const parsed = identitySchema.safeParse({
    name: sanitizePlainText(String(formData.get("name") ?? ""), 80),
    handle: sanitizePlainText(String(formData.get("handle") ?? ""), 30).toLowerCase(),
    headline: sanitizePlainText(String(formData.get("headline") ?? ""), 140),
    bio: sanitizeMultiline(String(formData.get("bio") ?? ""), 500),
    city: sanitizePlainText(String(formData.get("city") ?? ""), 80),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the profile fields" };
  }

  const country = sanitizePlainText(String(formData.get("country") ?? ""), 8).toUpperCase();
  if (country && !isCountryCode(country)) {
    return { error: "Choose a country" };
  }

  const clerkUser = clerkEnabled ? await currentUser() : null;
  const clerkImageUrl = clerkUser?.imageUrl ?? null;
  const image = optionalImage(
    String(formData.get("imageUrl") ?? ""),
    userId,
    existing.imageUrl,
    clerkImageUrl,
  );
  if ("error" in image) return { error: image.error };
  const cover = optionalImage(
    String(formData.get("coverUrl") ?? ""),
    userId,
    existing.coverUrl,
    clerkImageUrl,
  );
  if ("error" in cover) return { error: cover.error };
  const keptImages = new Set([existing.imageUrl, existing.coverUrl].filter((url): url is string => Boolean(url)));
  for (const url of [image.url, cover.url]) {
    if (!url) continue;
    if (
      !(await confirmNewR2Object({
        url,
        userIds: [userId],
        maxBytes: MAX_IMAGE_BYTES,
        keptUrls: keptImages,
      }))
    ) {
      return { error: "Use an uploaded image" };
    }
  }

  const links: Record<(typeof LINK_FIELDS)[number]["field"], string | null> = {
    websiteUrl: null,
    xUrl: null,
    githubUrl: null,
    linkedinUrl: null,
    redditUrl: null,
  };
  for (const link of LINK_FIELDS) {
    const text = sanitizePlainText(String(formData.get(link.field) ?? ""), 500);
    if (!text) {
      links[link.field] = null;
      continue;
    }
    const url = sanitizeProfileLink(link.key, text);
    if (!url) return { error: `Enter a valid ${link.label} URL` };
    links[link.field] = url;
  }

  const db = getDb();
  try {
    await db
      .update(profiles)
      .set({
        name: parsed.data.name,
        handle: parsed.data.handle,
        headline: blankToNull(parsed.data.headline),
        bio: blankToNull(parsed.data.bio),
        city: blankToNull(parsed.data.city),
        country: country || null,
        imageUrl: image.url,
        coverUrl: cover.url,
        websiteUrl: links.websiteUrl,
        xUrl: links.xUrl,
        githubUrl: links.githubUrl,
        linkedinUrl: links.linkedinUrl,
        redditUrl: links.redditUrl,
        updatedAt: new Date(),
      })
      .where(eq(profiles.clerkUserId, userId));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "That handle is taken" };
    throw error;
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings", "layout");
  if (existing.handle !== parsed.data.handle) {
    revalidatePath(`/u/${existing.handle}`);
  }
  revalidatePath(`/u/${parsed.data.handle}`);
  return { saved: true };
}
