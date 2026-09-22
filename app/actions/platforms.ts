"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { platforms } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { getPlatformById } from "@/lib/queries";
import { sanitizePlainText, slugify } from "@/lib/sanitize";
import { isAllowedPlatformLogoUrl } from "@/lib/urls";

async function uniquePlatformSlug(base: string, excludeId?: string) {
  const db = getDb();
  let slug = base || "platform";
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? slug : `${slug.slice(0, 70)}-${i + 1}`;
    const [existing] = await db
      .select({ id: platforms.id })
      .from(platforms)
      .where(eq(platforms.slug, candidate))
      .limit(1);
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${slug.slice(0, 60)}-${crypto.randomUUID().slice(0, 8)}`;
}

function parseSortOrder(raw: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) return 0;
  return Math.min(10000, Math.max(0, value));
}

export async function upsertPlatformAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  await requireAdmin();
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 40);
  const requestedSlug = slugify(String(formData.get("slug") ?? "") || name);
  const logoUrl = String(formData.get("logoUrl") ?? "");
  const sortOrder = parseSortOrder(String(formData.get("sortOrder") ?? "0"));
  const archived = formData.get("archived") === "on";

  if (!name) return { error: "Enter a platform name" };
  if (!isAllowedPlatformLogoUrl(logoUrl)) return { error: "Upload a valid platform logo" };

  let existing = null;
  if (id) {
    existing = await getPlatformById(id);
    if (!existing) return { error: "Platform not found" };
  }

  const slug = await uniquePlatformSlug(requestedSlug, existing?.id);
  const db = getDb();
  const values = {
    name,
    slug,
    logoUrl,
    sortOrder,
    archivedAt: archived ? (existing?.archivedAt ?? new Date()) : null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(platforms).set(values).where(eq(platforms.id, existing.id));
  } else {
    await db.insert(platforms).values(values);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/platforms");
  revalidatePath("/games/new");
  redirect("/admin/platforms");
}

export async function setPlatformArchivedAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  const platform = await getPlatformById(id);
  if (!platform) throw new Error("Platform not found");

  const db = getDb();
  await db
    .update(platforms)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(platforms.id, id));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/platforms");
  revalidatePath("/games/new");
}
