export type AdFormat = "brand" | "media";

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

export type AdSlotRecord = {
  id: string;
  status: "pending" | "approved" | "rejected" | "removed";
};

export type AdOrderRecord = AdCreativePrefill & {
  id: string;
  year: number;
  month: number;
  monthLabel: string;
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
