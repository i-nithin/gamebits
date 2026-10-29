"use server";

import { revalidatePath } from "next/cache";

import { createApiKey, revokeApiKey } from "@/lib/api/keys";
import { API_KEY_NAME_MAX, apiKeyExpiresAt, isApiKeyExpiryId } from "@/lib/api/token";
import { accountAccessError, getCurrentUserId } from "@/lib/auth-admin";
import { hasDatabase } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid, sanitizePlainText } from "@/lib/sanitize";

export async function createApiKeyAction(name: string, expiry: string) {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) return { ok: false as const, error: blocked ?? "Sign in to continue" };
  if (!hasDatabase()) return { ok: false as const, error: "Try again in a moment." };

  const limit = await rateLimit("apiKeyCreate", userId);
  if (limit === "limited") {
    return { ok: false as const, error: "Too many keys created. Try again later." };
  }
  if (limit === "unavailable") return { ok: false as const, error: "Try again in a moment." };

  const cleaned = sanitizePlainText(name, API_KEY_NAME_MAX);
  if (!cleaned) return { ok: false as const, error: "Name the key so you can tell it apart." };
  if (!isApiKeyExpiryId(expiry)) return { ok: false as const, error: "Choose when the key expires." };

  const created = await createApiKey(userId, cleaned, apiKeyExpiresAt(expiry));
  if (!created.ok) return created;
  revalidatePath("/settings/developer");
  return created;
}

export async function revokeApiKeyAction(id: string) {
  const userId = await getCurrentUserId();
  const blocked = await accountAccessError(userId);
  if (!userId || blocked) return { ok: false as const, error: blocked ?? "Sign in to continue" };
  if (!isUuid(id)) return { ok: false as const, error: "That key is not yours" };

  const revoked = await revokeApiKey(userId, id);
  if (!revoked) return { ok: false as const, error: "That key is already revoked" };
  revalidatePath("/settings/developer");
  return { ok: true as const };
}
