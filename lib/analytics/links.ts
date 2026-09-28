import { GAME_LINK_FIELDS, GAME_LINK_KINDS, type GameLinkKind } from "@/lib/constants";

export const PRIMARY_LINK_KIND = "primary";

export type AnalyticsLinkKind = typeof PRIMARY_LINK_KIND | GameLinkKind;

const GAME_LINK_KIND_SET = new Set<string>(GAME_LINK_KINDS);

export function isAnalyticsLinkKind(value: string): value is AnalyticsLinkKind {
  return value === PRIMARY_LINK_KIND || GAME_LINK_KIND_SET.has(value);
}

export function trackedOutboundHref(slug: string, kind: AnalyticsLinkKind) {
  return `/out/${encodeURIComponent(slug)}?kind=${kind}`;
}

export function analyticsLinkLabel(kind: AnalyticsLinkKind) {
  if (kind === PRIMARY_LINK_KIND) return "Play";
  return GAME_LINK_FIELDS.find((field) => field.kind === kind)?.label ?? kind;
}

const LINK_KIND_ORDER: AnalyticsLinkKind[] = [PRIMARY_LINK_KIND, ...GAME_LINK_KINDS];

export function compareAnalyticsLinkKind(a: AnalyticsLinkKind, b: AnalyticsLinkKind) {
  return LINK_KIND_ORDER.indexOf(a) - LINK_KIND_ORDER.indexOf(b);
}
