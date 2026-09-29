export const DEFAULT_PLATFORMS = [
  { slug: "windows", name: "Windows", logoUrl: "/platforms/windows.svg", sortOrder: 10 },
  { slug: "macos", name: "macOS", logoUrl: "/platforms/macos.svg", sortOrder: 20 },
  { slug: "ios", name: "iOS", logoUrl: "/platforms/ios.svg", sortOrder: 30 },
  { slug: "android", name: "Android", logoUrl: "/platforms/android.svg", sortOrder: 40 },
  { slug: "web", name: "Web", logoUrl: "/platforms/web.svg", sortOrder: 50 },
  { slug: "nintendo", name: "Nintendo", logoUrl: "/platforms/nintendo.svg", sortOrder: 60 },
  { slug: "playstation", name: "PlayStation", logoUrl: "/platforms/playstation.svg", sortOrder: 70 },
  { slug: "xbox", name: "Xbox", logoUrl: "/platforms/xbox.svg", sortOrder: 80 },
] as const;

/** Maps legacy free-text game.platforms values onto catalog slugs. */
export const LEGACY_PLATFORM_SLUGS: Record<string, string> = {
  pc: "windows",
  windows: "windows",
  win: "windows",
  macos: "macos",
  mac: "macos",
  osx: "macos",
  ios: "ios",
  iphone: "ios",
  ipad: "ios",
  android: "android",
  web: "web",
  browser: "web",
  nintendo: "nintendo",
  switch: "nintendo",
  playstation: "playstation",
  ps4: "playstation",
  ps5: "playstation",
  xbox: "xbox",
};

const PLATFORM_LOGO_PATH = /^\/platforms\/[a-z0-9][a-z0-9-]*\.(svg|png|webp|jpe?g|gif)$/i;
const PLATFORM_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPlatformId(value: string) {
  return PLATFORM_ID_RE.test(value);
}

export function isLocalPlatformLogoUrl(raw: string) {
  return PLATFORM_LOGO_PATH.test(raw);
}
