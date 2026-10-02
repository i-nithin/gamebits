"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { categories, gameCategories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-admin";
import { getDb } from "@/lib/db";
import { getCategoryById } from "@/lib/queries";
import { sanitizePlainText, slugify } from "@/lib/sanitize";

async function uniqueCategorySlug(base: string, excludeId?: string) {
  const db = getDb();
  const slug = base || "category";
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? slug : `${slug.slice(0, 70)}-${i + 1}`;
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, candidate))
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

async function gamesUsingCategory(id: string) {
  const db = getDb();
  const [row] = await db
    .select({ gameCount: count(gameCategories.id) })
    .from(gameCategories)
    .where(eq(gameCategories.categoryId, id));
  return Number(row?.gameCount ?? 0);
}

function revalidateCategorySurfaces() {
  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/4dm1n");
  revalidatePath("/4dm1n/categories");
  revalidatePath("/games/new");
}

export async function upsertCategoryAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  await requireAdmin();
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 40);
  const requestedSlug = slugify(String(formData.get("slug") ?? "") || name);
  const sortOrder = parseSortOrder(String(formData.get("sortOrder") ?? "0"));
  const archived = formData.get("archived") === "on";

  if (!name) return { error: "Enter a category name" };

  let existing = null;
  if (id) {
    existing = await getCategoryById(id);
    if (!existing) return { error: "Category not found" };
  }

  if (archived && existing && (await gamesUsingCategory(existing.id)) > 0) {
    return { error: "Unassign this category from games before archiving it" };
  }

  const slug = await uniqueCategorySlug(requestedSlug, existing?.id);
  const db = getDb();
  const values = {
    name,
    slug,
    sortOrder,
    archivedAt: archived ? (existing?.archivedAt ?? new Date()) : null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(categories).set(values).where(eq(categories.id, existing.id));
  } else {
    await db.insert(categories).values(values);
  }

  revalidateCategorySurfaces();
  redirect("/4dm1n/categories");
}

export async function setCategoryArchivedAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  const category = await getCategoryById(id);
  if (!category) throw new Error("Category not found");
  if (archived && (await gamesUsingCategory(id)) > 0) {
    throw new Error("Unassign this category from games before archiving it");
  }

  const db = getDb();
  await db
    .update(categories)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id));

  revalidateCategorySurfaces();
}
