import type { CarouselBadge, IarcRating } from "@/lib/constants";

export type AdFormat = "brand" | "media";
export type AdPlacement = "sidebar" | "carousel";

export function isCarouselVideo(url: string) {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  return path.endsWith(".mp4") || path.endsWith(".webm");
}

export type MonthOption = {
  year: number;
  month: number;
  key: string;
  label: string;
  booked: number;
  cap: number;
  full: boolean;
  windowLabel: string;
};

export type AdCreativePrefill = {
  format: AdFormat;
  logoUrl: string | null;
  productName: string | null;
  tagline: string | null;
  mediaUrl: string | null;
  destinationUrl: string;
};

export type SidebarAd = {
  id: string;
  format: AdFormat;
  logoUrl: string | null;
  productName: string | null;
  tagline: string | null;
  mediaUrl: string | null;
  destinationUrl: string;
  weight: number;
};

export type CarouselAd = {
  id: string;
  destinationUrl: string;
  mediaUrl: string;
  tagline: string | null;
  badge: CarouselBadge | null;
  countdownEndsAt: string | null;
  gameName: string;
  developerName: string;
  iarcRating: IarcRating;
  reviewAverage: number | null;
  reviewCount: number;
};

export type CarouselGameChoice = {
  id: string;
  slug: string;
  name: string;
  developerName: string;
  iarcRating: IarcRating | null;
  reviewAverage: number | null;
  reviewCount: number;
};

export type AdSlotRecord = {
  id: string;
  status: "pending" | "approved" | "rejected" | "removed";
};

export type AdOrderRecord = AdCreativePrefill & {
  id: string;
  placement: AdPlacement;
  year: number;
  month: number;
  monthLabel: string;
  gameId: string | null;
  gameName: string | null;
  gameSlug: string | null;
  developerName: string | null;
  iarcRating: IarcRating | null;
  badge: CarouselBadge | null;
  countdownEndsAt: string | null;
  slotCount: number;
  activeSlots: number;
  status: "pending" | "approved" | "rejected" | "removed";
  phase: "pending" | "scheduled" | "live" | "ended" | "rejected" | "removed";
  bookedAt: string;
  clickCount: number;
  ownerName: string;
  ownerHandle: string;
  slots: AdSlotRecord[];
};
