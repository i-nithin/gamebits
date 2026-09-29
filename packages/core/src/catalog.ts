import { count, eq } from "drizzle-orm";

import { getDb } from "@gamebits/db";
import { categories, gameCategories, platforms } from "@gamebits/db/schema";

import { getCategoryById, getPlatformById } from "./queries";
import { sanitizePlainText, slugify } from "./sanitize";
import { isAllowedPlatformLogoUrl } from "./urls";

function parseSortOrder(raw: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) return 0;
  return Math.min(10000, Math.max(0, value));
}

async function uniqueSlug(
  table: "platforms" | "categories",
  base: string,
  excludeId?: string,
) {
  const db = getDb();
  const slug = base || (table === "platforms" ? "platform" : "category");
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? slug : `${slug.slice(0, 70)}-${i + 1}`;
    const rows =
      table === "platforms"
        ? await db
            .select({ id: platforms.id })
            .from(platforms)
            .where(eq(platforms.slug, candidate))
            .limit(1)
        : await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.slug, candidate))
            .limit(1);
    if (!rows[0] || rows[0].id === excludeId) return candidate;
  }
  return `${slug.slice(0, 60)}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function upsertPlatform(formData: FormData): Promise<{ error: string } | null> {
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

  const slug = await uniqueSlug("platforms", requestedSlug, existing?.id);
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
  return null;
}

export async function setPlatformArchived(id: string, archived: boolean) {
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
}

async function gamesUsingCategory(id: string) {
  const db = getDb();
  const [row] = await db
    .select({ gameCount: count(gameCategories.id) })
    .from(gameCategories)
    .where(eq(gameCategories.categoryId, id));
  return Number(row?.gameCount ?? 0);
}

export async function upsertCategory(formData: FormData): Promise<{ error: string } | null> {
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

  const slug = await uniqueSlug("categories", requestedSlug, existing?.id);
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
  return null;
}

export async function setCategoryArchived(id: string, archived: boolean) {
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
}
