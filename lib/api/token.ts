import { createHash, randomBytes } from "node:crypto";

export const API_KEY_TOKEN_PREFIX = "gb_live_";
export const MAX_LIVE_API_KEYS = 5;
export const API_KEY_NAME_MAX = 40;
export const API_KEY_EXPIRY_DEFAULT = "30d";

export const API_KEY_EXPIRY_OPTIONS = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "365d", label: "1 year", days: 365 },
  { id: "never", label: "No expiry", days: null },
] as const;

export type ApiKeyExpiryId = (typeof API_KEY_EXPIRY_OPTIONS)[number]["id"];

const API_TOKEN_RE = /^gb_live_[A-Za-z0-9_-]{43}$/;

export type ApiKeyRecord = {
  revokedAt: Date | string | null;
  expiresAt?: Date | string | null;
  scopes: readonly string[];
  bannedAt: Date | string | null;
  deletedAt: Date | string | null;
  purgedAt: Date | string | null;
};

export function isApiKeyExpiryId(value: string): value is ApiKeyExpiryId {
  return API_KEY_EXPIRY_OPTIONS.some((option) => option.id === value);
}

export function apiKeyExpiresAt(choice: ApiKeyExpiryId, now = new Date()) {
  const option = API_KEY_EXPIRY_OPTIONS.find((item) => item.id === choice);
  if (!option || option.days == null) return null;
  return new Date(now.getTime() + option.days * 24 * 60 * 60 * 1000);
}

export function isApiKeyExpired(expiresAt: Date | string | null | undefined, now = new Date()) {
  if (!expiresAt) return false;
  const at = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return at.getTime() <= now.getTime();
}

export function createApiToken() {
  return `${API_KEY_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function isApiToken(value: string) {
  return API_TOKEN_RE.test(value);
}

export function hashApiToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function describeApiToken(token: string) {
  if (!isApiToken(token)) return null;
  return {
    keyPrefix: token.slice(0, API_KEY_TOKEN_PREFIX.length + 8),
    keyLast4: token.slice(-4),
  };
}

export function apiKeyAccess(record: ApiKeyRecord, now = new Date()) {
  if (record.revokedAt || record.bannedAt || record.deletedAt || record.purgedAt) return "inactive" as const;
  if (isApiKeyExpired(record.expiresAt, now)) return "inactive" as const;
  if (!record.scopes.includes("read")) return "inactive" as const;
  return "ok" as const;
}
