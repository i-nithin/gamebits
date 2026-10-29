import type { GameLinkKind } from "@/lib/constants";
import { isLocalPlatformLogoUrl } from "@/lib/platform-catalog";

function ipv4Parts(host: string) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return null;
  const parts = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  if (parts.some((part) => part > 255)) return null;
  return parts;
}

function isPrivateIpv4(parts: number[]) {
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isBlockedHost(host: string) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }
  const ipv4 = ipv4Parts(normalized);
  if (ipv4) return isPrivateIpv4(ipv4);
  if (!normalized.includes(":")) return false;
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.startsWith("fe80:")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = ipv4Parts(normalized.slice("::ffff:".length));
    if (mapped) return isPrivateIpv4(mapped);
  }
  return false;
}

const LINK_HOSTS: Record<GameLinkKind, string[]> = {
  web: [],
  steam: ["store.steampowered.com", "steamcommunity.com"],
  playstore: ["play.google.com"],
  appstore: ["apps.apple.com"],
  nintendo: ["www.nintendo.com", "nintendo.com", "www.nintendo.co.uk", "nintendo.co.uk"],
  playstation: ["store.playstation.com", "www.playstation.com", "playstation.com"],
  xbox: ["www.xbox.com", "xbox.com", "www.microsoft.com", "microsoft.com"],
  discord: ["discord.gg", "discord.com", "www.discord.com"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

const IMAGE_HOSTS = new Set([
  "imagedelivery.net",
  "images.unsplash.com",
  "picsum.photos",
]);

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

function r2PublicHostname() {
  const raw = process.env.R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export type VideoEmbed =
  | { provider: "youtube"; id: string; watchUrl: string; embedUrl: string }
  | { provider: "vimeo"; id: string; watchUrl: string; embedUrl: string };

export function withVideosFirst<T extends { kind: string }>(items: T[]): T[] {
  if (items.length < 2) return items;
  const videos: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (item.kind === "video") videos.push(item);
    else rest.push(item);
  }
  if (videos.length === 0) return items;
  return [...videos, ...rest];
}

export function youtubeThumbnailUrl(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function vimeoOembedUrl(watchUrl: string) {
  return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(watchUrl)}`;
}

function parseHttpsUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (isBlockedHost(parsed.hostname)) return null;
  return parsed;
}

function hostAllowed(host: string, allowed: string[]) {
  return allowed.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

const PROFILE_LINK_HOSTS = {
  x: ["x.com", "twitter.com"],
  github: ["github.com"],
  linkedin: ["linkedin.com"],
  reddit: ["reddit.com"],
} as const;

export type ProfileLinkKind = "website" | keyof typeof PROFILE_LINK_HOSTS;

export function sanitizeProfileLink(kind: ProfileLinkKind, raw: string) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return null;
  if (kind !== "website" && !hostAllowed(parsed.hostname.toLowerCase(), [...PROFILE_LINK_HOSTS[kind]])) {
    return null;
  }
  parsed.hash = "";
  return parsed.toString();
}

export function sanitizeHttpsUrl(raw: string) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return null;
  parsed.hash = "";
  return parsed.toString();
}

export function sanitizeGameLink(kind: GameLinkKind, raw: string) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();
  const allowed = LINK_HOSTS[kind];
  if (kind !== "web" && !hostAllowed(host, allowed)) return null;
  parsed.hash = "";
  return parsed.toString();
}

export function parseVideoEmbed(raw: string): VideoEmbed | null {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    let id = "";
    if (host === "youtu.be" || host === "www.youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    } else {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "watch") {
        id = parsed.searchParams.get("v") ?? "";
      } else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        id = parts[1] ?? "";
      } else if (parsed.searchParams.get("v")) {
        id = parsed.searchParams.get("v") ?? "";
      }
    }
    if (!YOUTUBE_ID.test(id)) return null;
    return {
      provider: "youtube",
      id,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  }

  if (VIMEO_HOSTS.has(host)) {
    const parts = parsed.pathname.split("/").filter(Boolean);
    const id = host === "player.vimeo.com" ? (parts[1] ?? "") : (parts[0] ?? "");
    if (!VIMEO_ID.test(id)) return null;
    return {
      provider: "vimeo",
      id,
      watchUrl: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
    };
  }

  return null;
}

export function isOwnedImageUrl(raw: string, userId: string) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed || !userId) return false;
  const host = parsed.hostname.toLowerCase();
  const r2Host = r2PublicHostname();
  if (r2Host && host === r2Host) {
    return parsed.pathname.split("/").filter(Boolean).includes(userId);
  }
  return IMAGE_HOSTS.has(host);
}

export function isProfileImageUrl(raw: string, userId: string, clerkImageUrl?: string | null) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return false;
  if (parsed.hostname.toLowerCase() === "img.clerk.com") {
    const clerk = clerkImageUrl ? parseHttpsUrl(clerkImageUrl) : null;
    if (!clerk || clerk.hostname.toLowerCase() !== "img.clerk.com") return false;
    return clerk.origin === parsed.origin && clerk.pathname === parsed.pathname;
  }
  return isOwnedImageUrl(raw, userId);
}

export function isOwnedR2Url(raw: string, userId: string) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed || !userId) return false;
  const host = r2PublicHostname();
  if (!host || parsed.hostname.toLowerCase() !== host) return false;
  return parsed.pathname.split("/").filter(Boolean).includes(userId);
}

export function isR2PublicUrl(raw: string) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return false;
  const host = r2PublicHostname();
  if (!host || parsed.hostname.toLowerCase() !== host) return false;
  return parsed.pathname.split("/").filter(Boolean).length > 0;
}

export function isAllowedClipUrl(raw: string) {
  if (!isR2PublicUrl(raw)) return false;
  const parsed = parseHttpsUrl(raw);
  return Boolean(parsed && /\.(mp4|webm)$/i.test(parsed.pathname));
}

export function isAllowedImageUrl(raw: string) {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  const r2Host = r2PublicHostname();
  if (r2Host && host === r2Host) {
    return parsed.pathname.split("/").filter(Boolean).length > 0;
  }
  return IMAGE_HOSTS.has(host);
}

export function isAllowedPlatformLogoUrl(raw: string) {
  return isLocalPlatformLogoUrl(raw) || isAllowedImageUrl(raw);
}
