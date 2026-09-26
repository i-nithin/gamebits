"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { gameLinks, gameMedia, gamePlatforms, games, platforms } from "@/db/schema";
import {
  canManageGame,
  getCurrentUserId,
  requireSignedIn,
} from "@/lib/auth-admin";
import {
  GAME_LINK_KINDS,
  GAME_MEDIA_CAP,
  GAME_STATUSES,
  PRIMARY_LINK_ORDER,
  type GameLinkKind,
} from "@/lib/constants";
import { getDb } from "@/lib/db";
import { isPlatformId } from "@/lib/platform-catalog";
import { getGameById } from "@/lib/queries";
import { sanitizeMultiline, sanitizePlainText, slugify } from "@/lib/sanitize";
import { isAllowedImageUrl, parseVideoEmbed, sanitizeGameLink, withVideosFirst } from "@/lib/urls";

const mediaItemSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().min(1).max(500),
});

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((tag) => sanitizePlainText(tag, 32))
    .filter(Boolean)
    .slice(0, 3);
}

function parseMedia(raw: string) {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid media payload");
  }
  const items = withVideosFirst(z.array(mediaItemSchema).max(GAME_MEDIA_CAP).parse(parsed));
  return items.map((item, index) => {
    if (item.kind === "image") {
      if (!isAllowedImageUrl(item.url)) {
        throw new Error("Invalid image URL");
      }
      return { kind: "image" as const, url: item.url, sortOrder: index };
    }
    const video = parseVideoEmbed(item.url);
    if (!video) {
      throw new Error("Videos must be a YouTube or Vimeo link");
    }
    return { kind: "video" as const, url: video.watchUrl, sortOrder: index };
  });
}

function parseLinks(formData: FormData) {
  const links: Array<{ kind: GameLinkKind; url: string }> = [];
  for (const kind of GAME_LINK_KINDS) {
    const raw = sanitizePlainText(String(formData.get(`link_${kind}`) ?? ""), 500);
    if (!raw) continue;
    const url = sanitizeGameLink(kind, raw);
    if (!url) {
      throw new Error(`Invalid ${kind} URL`);
    }
    links.push({ kind, url });
  }
  if (links.length < 1) {
    throw new Error("Add at least one store or website URL");
  }
  return links;
}

function derivePrimaryUrl(links: Array<{ kind: GameLinkKind; url: string }>) {
  for (const kind of PRIMARY_LINK_ORDER) {
    const match = links.find((link) => link.kind === kind);
    if (match) return match.url;
  }
  return links[0].url;
}

async function uniqueSlug(base: string, excludeId?: string) {
  const db = getDb();
  let slug = base || "game";
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? slug : `${slug.slice(0, 70)}-${i + 1}`;
    const [existing] = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.slug, candidate))
      .limit(1);
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${slug.slice(0, 60)}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function upsertOwnedGameAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Sign in to continue" };
  const id = formData.get("id") ? String(formData.get("id")) : undefined;

  let existing = null;
  if (id) {
    existing = await getGameById(id);
    if (!existing) return { error: "Game not found" };
    if (!canManageGame(userId, existing.ownerClerkUserId)) {
      return { error: "Unauthorized" };
    }
  }

  const name = sanitizePlainText(String(formData.get("name") ?? ""), 120);
  const tagline = sanitizePlainText(String(formData.get("tagline") ?? ""), 160);
  const description = sanitizeMultiline(String(formData.get("description") ?? ""), 4000);
  const developerName = sanitizePlainText(String(formData.get("developerName") ?? ""), 120);
  const logoUrl = String(formData.get("logoUrl") ?? "");
  const statusRaw = String(formData.get("status") ?? "upcoming");
  const requestedIds = [
    ...new Set(formData.getAll("platforms").map(String).filter(isPlatformId)),
  ];
  const requestedSlug = slugify(String(formData.get("slug") ?? "") || name);

  if (!name || !tagline || !description || !developerName) {
    return { error: "Fill in name, tagline, description, and developer" };
  }
  if (!GAME_STATUSES.includes(statusRaw as (typeof GAME_STATUSES)[number])) {
    return { error: "Invalid status" };
  }
  if (requestedIds.length < 1) return { error: "Select at least one platform" };
  if (!isAllowedImageUrl(logoUrl)) return { error: "Upload a valid logo image" };

  const db = getDb();
  const catalogRows = await db
    .select({ id: platforms.id })
    .from(platforms)
    .where(inArray(platforms.id, requestedIds));
  if (catalogRows.length !== requestedIds.length) {
    return { error: "Select a valid platform" };
  }
  const platformIds = catalogRows.map((row) => row.id);

  let media;
  let links;
  try {
    media = parseMedia(String(formData.get("media") ?? "[]"));
    links = parseLinks(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid media or links" };
  }
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const firstImage = media.find((item) => item.kind === "image");
  const firstVideo = media.find((item) => item.kind === "video");
  const coverUrl = firstImage?.url ?? logoUrl;
  const primaryUrl = derivePrimaryUrl(links);
  const trailerUrl = firstVideo?.url ?? null;
  const archived = formData.get("archived") === "on";
  const slug = await uniqueSlug(requestedSlug, existing?.id);

  const values = {
    name,
    slug,
    tagline,
    description,
    logoUrl,
    coverUrl,
    trailerUrl,
    developerName,
    primaryUrl,
    status: statusRaw as (typeof GAME_STATUSES)[number],
    tags,
    archivedAt: archived ? (existing?.archivedAt ?? new Date()) : null,
    updatedAt: new Date(),
  };

  let gameId = existing?.id;
  if (gameId) {
    await db.update(games).set(values).where(eq(games.id, gameId));
    await db.delete(gameMedia).where(eq(gameMedia.gameId, gameId));
    await db.delete(gameLinks).where(eq(gameLinks.gameId, gameId));
    await db.delete(gamePlatforms).where(eq(gamePlatforms.gameId, gameId));
  } else {
    const [created] = await db
      .insert(games)
      .values({
        ...values,
        ownerClerkUserId: userId,
      })
      .returning({ id: games.id, slug: games.slug });
    gameId = created.id;
  }

  if (media.length > 0) {
    await db.insert(gameMedia).values(
      media.map((item) => ({
        gameId: gameId!,
        kind: item.kind,
        url: item.url,
        sortOrder: item.sortOrder,
      })),
    );
  }
  await db.insert(gameLinks).values(
    links.map((link) => ({
      gameId: gameId!,
      kind: link.kind,
      url: link.url,
    })),
  );
  await db.insert(gamePlatforms).values(
    platformIds.map((platformId) => ({
      gameId: gameId!,
      platformId,
    })),
  );

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/games/${slug}`);
  redirect(`/games/${slug}`);
}

export async function setGameArchivedAction(formData: FormData) {
  const userId = await requireSignedIn();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  const game = await getGameById(id);
  if (!game) throw new Error("Game not found");
  if (!canManageGame(userId, game.ownerClerkUserId)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();
  await db
    .update(games)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(games.id, id));

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/games/${game.slug}`);
  revalidatePath(`/games/${game.slug}/edit`);
}
