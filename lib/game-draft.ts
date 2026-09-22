import {
  GAME_LINK_KINDS,
  GAME_STATUSES,
  type GameLinkKind,
  type GameStatus,
} from "@/lib/constants";
import { isPlatformId } from "@/lib/platform-catalog";

const DRAFT_KEY = "gamebits:add-game:v1";
const UPLOAD_CACHE_KEY = "gamebits:uploads:v1";
const UPLOAD_CACHE_CAP = 40;

export type GameDraftMedia = {
  key: string;
  kind: "image" | "video";
  url: string;
};

export type GameDraft = {
  name: string;
  developerName: string;
  tagline: string;
  description: string;
  status: GameStatus;
  tags: string;
  platforms: string[];
  logoUrl: string;
  media: GameDraftMedia[];
  links: Record<GameLinkKind, string>;
};

const EMPTY_LINKS = Object.fromEntries(GAME_LINK_KINDS.map((kind) => [kind, ""])) as Record<
  GameLinkKind,
  string
>;

export function emptyGameDraft(): GameDraft {
  return {
    name: "",
    developerName: "",
    tagline: "",
    description: "",
    status: "upcoming",
    tags: "",
    platforms: [],
    logoUrl: "",
    media: [],
    links: { ...EMPTY_LINKS },
  };
}

export function isGameDraftEmpty(draft: GameDraft) {
  return (
    !draft.name &&
    !draft.developerName &&
    !draft.tagline &&
    !draft.description &&
    !draft.tags &&
    !draft.logoUrl &&
    draft.media.length === 0 &&
    draft.platforms.length === 0 &&
    GAME_LINK_KINDS.every((kind) => !draft.links[kind])
  );
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing, quota, or disabled storage.
  }
}

function isDraft(value: unknown): value is GameDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<GameDraft>;
  return (
    typeof draft.name === "string" &&
    typeof draft.developerName === "string" &&
    typeof draft.tagline === "string" &&
    typeof draft.description === "string" &&
    typeof draft.tags === "string" &&
    typeof draft.logoUrl === "string" &&
    Array.isArray(draft.platforms) &&
    Array.isArray(draft.media)
  );
}

export function loadGameDraft(): GameDraft | null {
  const parsed = readJson(DRAFT_KEY);
  if (!isDraft(parsed)) return null;

  const status = GAME_STATUSES.includes(parsed.status as GameStatus)
    ? (parsed.status as GameStatus)
    : "upcoming";
  const platforms = parsed.platforms.filter(
    (platform): platform is string => typeof platform === "string" && isPlatformId(platform),
  );
  const media = parsed.media.filter(
    (item): item is GameDraftMedia =>
      Boolean(item) &&
      typeof item.key === "string" &&
      (item.kind === "image" || item.kind === "video") &&
      typeof item.url === "string",
  );
  const links = { ...EMPTY_LINKS };
  for (const kind of GAME_LINK_KINDS) {
    const value = parsed.links?.[kind];
    if (typeof value === "string") links[kind] = value;
  }

  return {
    name: parsed.name,
    developerName: parsed.developerName,
    tagline: parsed.tagline,
    description: parsed.description,
    status,
    tags: parsed.tags,
    platforms,
    logoUrl: parsed.logoUrl,
    media,
    links,
  };
}

export function saveGameDraft(draft: GameDraft) {
  if (isGameDraftEmpty(draft)) {
    clearGameDraft();
    return;
  }
  writeJson(DRAFT_KEY, draft);
}

export function clearGameDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function fileFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

export function getCachedUploadUrl(fingerprint: string) {
  const cache = readJson(UPLOAD_CACHE_KEY);
  if (!cache || typeof cache !== "object") return null;
  const url = (cache as Record<string, unknown>)[fingerprint];
  return typeof url === "string" ? url : null;
}

export function cacheUploadUrl(fingerprint: string, url: string) {
  const current = readJson(UPLOAD_CACHE_KEY);
  const cache =
    current && typeof current === "object" ? { ...(current as Record<string, string>) } : {};
  cache[fingerprint] = url;
  const keys = Object.keys(cache);
  if (keys.length > UPLOAD_CACHE_CAP) {
    for (const key of keys.slice(0, keys.length - UPLOAD_CACHE_CAP)) {
      delete cache[key];
    }
  }
  writeJson(UPLOAD_CACHE_KEY, cache);
}
