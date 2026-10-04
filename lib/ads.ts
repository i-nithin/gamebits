import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { adOrders, adSlots, profiles } from "@/db/schema";
import {
  AD_PHASE_LABELS,
  formatMonthLabel,
  formatPacificInstant,
  liveWindowLabel,
  monthKey,
  monthWindow,
  orderPhase,
  type PacificMonth,
} from "@/lib/ads-month";
import type { AdOrderRecord, MonthOption, SidebarAd } from "@/lib/ads-types";
import { AD_MONTH_WINDOW, AD_SLOT_CAP } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { r2PublicBaseUrl } from "@/lib/cloudflare-r2";

const OCCUPYING = ["pending", "approved"] as const;

export { AD_PHASE_LABELS };

function monthInWindow(month: PacificMonth, now = new Date()) {
  return monthWindow(AD_MONTH_WINDOW, now).some(
    (item) => item.year === month.year && item.month === month.month,
  );
}

export function isAdImageUrl(url: string, userId: string) {
  const base = r2PublicBaseUrl();
  if (!base) return false;
  try {
    const parsed = new URL(url);
    const root = new URL(base);
    if (parsed.origin !== root.origin) return false;
    const prefix = `${root.pathname.replace(/\/$/, "")}/ads/${userId}/`;
    return parsed.pathname.startsWith(prefix);
  } catch {
    return false;
  }
}

export async function listMonthOptions(now = new Date()): Promise<MonthOption[]> {
  const months = monthWindow(AD_MONTH_WINDOW, now);
  const db = getDb();
  const rows = await db
    .select({
      year: adOrders.year,
      month: adOrders.month,
      booked: sql<number>`count(*)::int`,
    })
    .from(adSlots)
    .innerJoin(adOrders, eq(adSlots.orderId, adOrders.id))
    .where(
      and(
        eq(adOrders.placement, "sidebar"),
        inArray(adSlots.status, [...OCCUPYING]),
        or(
          ...months.map((month) =>
            and(eq(adOrders.year, month.year), eq(adOrders.month, month.month)),
          ),
        ),
      ),
    )
    .groupBy(adOrders.year, adOrders.month);

  const bookedByKey = new Map(
    rows.map((row) => [monthKey({ year: row.year, month: row.month }), Number(row.booked)]),
  );

  return months.map((month) => {
    const booked = bookedByKey.get(monthKey(month)) ?? 0;
    return {
      year: month.year,
      month: month.month,
      key: monthKey(month),
      label: formatMonthLabel(month),
      booked,
      cap: AD_SLOT_CAP,
      full: booked >= AD_SLOT_CAP,
      windowLabel: liveWindowLabel(month),
    };
  });
}

export async function listLiveSidebarAds(now = new Date()): Promise<SidebarAd[]> {
  const month = monthWindow(1, now)[0];
  const db = getDb();
  const rows = await db
    .select({
      id: adOrders.id,
      format: adOrders.format,
      logoUrl: adOrders.logoUrl,
      productName: adOrders.productName,
      tagline: adOrders.tagline,
      mediaUrl: adOrders.mediaUrl,
      destinationUrl: adOrders.destinationUrl,
      weight: sql<number>`count(*)::int`,
    })
    .from(adOrders)
    .innerJoin(adSlots, eq(adSlots.orderId, adOrders.id))
    .where(
      and(
        eq(adOrders.placement, "sidebar"),
        eq(adOrders.status, "approved"),
        eq(adSlots.status, "approved"),
        eq(adOrders.year, month.year),
        eq(adOrders.month, month.month),
      ),
    )
    .groupBy(
      adOrders.id,
      adOrders.format,
      adOrders.logoUrl,
      adOrders.productName,
      adOrders.tagline,
      adOrders.mediaUrl,
      adOrders.destinationUrl,
    )
    .orderBy(adOrders.bookedAt);

  return rows.map((row) => ({
    id: row.id,
    format: row.format,
    logoUrl: row.logoUrl,
    productName: row.productName,
    tagline: row.tagline,
    mediaUrl: row.mediaUrl,
    destinationUrl: row.destinationUrl,
    weight: Number(row.weight),
  }));
}

type OrderRow = {
  id: string;
  format: "brand" | "media";
  year: number;
  month: number;
  logoUrl: string | null;
  productName: string | null;
  tagline: string | null;
  mediaUrl: string | null;
  destinationUrl: string;
  slotCount: number;
  status: "pending" | "approved" | "rejected" | "removed";
  bookedAt: Date;
  clickCount: number;
  ownerName: string;
  ownerHandle: string;
  slotId: string;
  slotStatus: "pending" | "approved" | "rejected" | "removed";
};

function groupOrders(rows: OrderRow[], now = new Date()): AdOrderRecord[] {
  const orders = new Map<string, AdOrderRecord>();
  for (const row of rows) {
    let order = orders.get(row.id);
    if (!order) {
      const month = { year: row.year, month: row.month };
      order = {
        id: row.id,
        format: row.format,
        year: row.year,
        month: row.month,
        monthLabel: formatMonthLabel(month),
        logoUrl: row.logoUrl,
        productName: row.productName,
        tagline: row.tagline,
        mediaUrl: row.mediaUrl,
        destinationUrl: row.destinationUrl,
        slotCount: row.slotCount,
        activeSlots: 0,
        status: row.status,
        phase: "pending",
        bookedAt: formatPacificInstant(row.bookedAt),
        clickCount: row.clickCount,
        ownerName: row.ownerName,
        ownerHandle: row.ownerHandle,
        slots: [],
      };
      orders.set(row.id, order);
    }
    order.slots.push({ id: row.slotId, status: row.slotStatus });
    if (row.slotStatus === "pending" || row.slotStatus === "approved") {
      order.activeSlots += 1;
    }
  }
  for (const order of orders.values()) {
    order.phase = orderPhase(
      order.status,
      { year: order.year, month: order.month },
      order.activeSlots,
      now,
    );
  }
  return [...orders.values()];
}

async function listOrders(
  where: ReturnType<typeof eq> | ReturnType<typeof and>,
  now = new Date(),
) {
  const db = getDb();
  const rows = await db
    .select({
      id: adOrders.id,
      format: adOrders.format,
      year: adOrders.year,
      month: adOrders.month,
      logoUrl: adOrders.logoUrl,
      productName: adOrders.productName,
      tagline: adOrders.tagline,
      mediaUrl: adOrders.mediaUrl,
      destinationUrl: adOrders.destinationUrl,
      slotCount: adOrders.slotCount,
      status: adOrders.status,
      bookedAt: adOrders.bookedAt,
      clickCount: adOrders.clickCount,
      ownerName: profiles.name,
      ownerHandle: profiles.handle,
      slotId: adSlots.id,
      slotStatus: adSlots.status,
    })
    .from(adOrders)
    .innerJoin(adSlots, eq(adSlots.orderId, adOrders.id))
    .innerJoin(profiles, eq(profiles.clerkUserId, adOrders.ownerClerkUserId))
    .where(where)
    .orderBy(desc(adOrders.bookedAt), adSlots.createdAt);
  return groupOrders(rows, now);
}

export function listUserAdOrders(userId: string) {
  return listOrders(eq(adOrders.ownerClerkUserId, userId));
}

export function listAdminAdOrders(month: PacificMonth) {
  return listOrders(
    and(
      eq(adOrders.placement, "sidebar"),
      eq(adOrders.year, month.year),
      eq(adOrders.month, month.month),
    ),
  );
}

const EDITABLE_PHASES = new Set(["pending", "scheduled", "live"]);

export async function getAdOrderForEdit(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: adOrders.id,
      format: adOrders.format,
      year: adOrders.year,
      month: adOrders.month,
      ownerClerkUserId: adOrders.ownerClerkUserId,
      logoUrl: adOrders.logoUrl,
      productName: adOrders.productName,
      tagline: adOrders.tagline,
      mediaUrl: adOrders.mediaUrl,
      destinationUrl: adOrders.destinationUrl,
      slotCount: adOrders.slotCount,
      status: adOrders.status,
    })
    .from(adOrders)
    .where(eq(adOrders.id, orderId))
    .limit(1);
  if (!row) return null;

  const [activeRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adSlots)
    .where(and(eq(adSlots.orderId, orderId), inArray(adSlots.status, [...OCCUPYING])));
  const activeSlots = Number(activeRow?.count ?? 0);
  const month = { year: row.year, month: row.month };
  const phase = orderPhase(row.status, month, activeSlots);
  return {
    ...row,
    activeSlots,
    phase,
    monthLabel: formatMonthLabel(month),
    editable: EDITABLE_PHASES.has(phase),
  };
}

export async function updateAdCreative(
  orderId: string,
  creative: Pick<
    CreativeInsert,
    "format" | "destinationUrl" | "logoUrl" | "productName" | "tagline" | "mediaUrl"
  >,
) {
  const order = await getAdOrderForEdit(orderId);
  if (!order) return { ok: false as const, error: "Booking not found" };
  if (!order.editable) {
    return { ok: false as const, error: "This booking can no longer be edited" };
  }

  const db = getDb();
  await db
    .update(adOrders)
    .set({
      format: creative.format,
      logoUrl: creative.logoUrl,
      productName: creative.productName,
      tagline: creative.tagline,
      mediaUrl: creative.mediaUrl,
      destinationUrl: creative.destinationUrl,
      updatedAt: new Date(),
    })
    .where(eq(adOrders.id, orderId));
  return { ok: true as const };
}

export async function getOwnedAdCreative(userId: string, orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      format: adOrders.format,
      logoUrl: adOrders.logoUrl,
      productName: adOrders.productName,
      tagline: adOrders.tagline,
      mediaUrl: adOrders.mediaUrl,
      destinationUrl: adOrders.destinationUrl,
    })
    .from(adOrders)
    .where(and(eq(adOrders.id, orderId), eq(adOrders.ownerClerkUserId, userId)))
    .limit(1);
  return row ?? null;
}

type CreativeInsert = {
  format: "brand" | "media";
  year: number;
  month: number;
  slotCount: number;
  destinationUrl: string;
  logoUrl: string | null;
  productName: string | null;
  tagline: string | null;
  mediaUrl: string | null;
};

export async function createAdOrder(input: {
  ownerClerkUserId: string;
  creative: CreativeInsert;
  status: "pending" | "approved";
  reviewedByClerkUserId: string | null;
}) {
  const { creative } = input;
  if (!monthInWindow(creative)) {
    return { ok: false as const, error: "That month is not open for booking" };
  }
  if (creative.slotCount < 1 || creative.slotCount > AD_SLOT_CAP) {
    return { ok: false as const, error: "Choose at least one slot" };
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(84215045, ${creative.year * 12 + creative.month})`,
    );
    const [countRow] = await tx
      .select({ booked: sql<number>`count(*)::int` })
      .from(adSlots)
      .innerJoin(adOrders, eq(adSlots.orderId, adOrders.id))
      .where(
        and(
          eq(adOrders.placement, "sidebar"),
          eq(adOrders.year, creative.year),
          eq(adOrders.month, creative.month),
          inArray(adSlots.status, [...OCCUPYING]),
        ),
      );
    const booked = Number(countRow?.booked ?? 0);
    if (booked + creative.slotCount > AD_SLOT_CAP) {
      return { ok: false as const, error: "That month does not have enough open slots" };
    }

    const now = new Date();
    const [order] = await tx
      .insert(adOrders)
      .values({
        placement: "sidebar",
        format: creative.format,
        year: creative.year,
        month: creative.month,
        ownerClerkUserId: input.ownerClerkUserId,
        logoUrl: creative.logoUrl,
        productName: creative.productName,
        tagline: creative.tagline,
        mediaUrl: creative.mediaUrl,
        destinationUrl: creative.destinationUrl,
        slotCount: creative.slotCount,
        status: input.status,
        reviewedAt: input.status === "approved" ? now : null,
        reviewedByClerkUserId: input.reviewedByClerkUserId,
      })
      .returning({ id: adOrders.id });

    await tx.insert(adSlots).values(
      Array.from({ length: creative.slotCount }, () => ({
        orderId: order.id,
        status: input.status,
      })),
    );
    return { ok: true as const, id: order.id, slotCount: creative.slotCount };
  });
}

async function occupyingLeft(orderId: string, tx: Pick<ReturnType<typeof getDb>, "select">) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(adSlots)
    .where(and(eq(adSlots.orderId, orderId), inArray(adSlots.status, [...OCCUPYING])));
  return Number(row?.count ?? 0);
}

export async function cancelAdOrder(userId: string, orderId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: adOrders.id, status: adOrders.status })
      .from(adOrders)
      .where(and(eq(adOrders.id, orderId), eq(adOrders.ownerClerkUserId, userId)))
      .limit(1);
    if (!order || order.status !== "pending") {
      return { ok: false as const, error: "Only a pending booking can be cancelled" };
    }
    const now = new Date();
    await tx
      .update(adSlots)
      .set({ status: "removed" })
      .where(and(eq(adSlots.orderId, orderId), eq(adSlots.status, "pending")));
    await tx
      .update(adOrders)
      .set({ status: "removed", updatedAt: now })
      .where(eq(adOrders.id, orderId));
    return { ok: true as const };
  });
}

export async function reviewAdOrder(
  adminId: string,
  orderId: string,
  decision: "approved" | "rejected",
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: adOrders.id, status: adOrders.status })
      .from(adOrders)
      .where(eq(adOrders.id, orderId))
      .limit(1);
    if (!order || order.status !== "pending") {
      return { ok: false as const, error: "That booking is no longer pending" };
    }
    const now = new Date();
    await tx
      .update(adSlots)
      .set({ status: decision })
      .where(and(eq(adSlots.orderId, orderId), eq(adSlots.status, "pending")));
    await tx
      .update(adOrders)
      .set({
        status: decision,
        reviewedAt: now,
        reviewedByClerkUserId: adminId,
        updatedAt: now,
      })
      .where(eq(adOrders.id, orderId));
    return { ok: true as const };
  });
}

export async function removeAdSlot(slotId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [slot] = await tx
      .select({ id: adSlots.id, orderId: adSlots.orderId, status: adSlots.status })
      .from(adSlots)
      .where(eq(adSlots.id, slotId))
      .limit(1);
    if (!slot || (slot.status !== "pending" && slot.status !== "approved")) {
      return { ok: false as const, error: "That slot is already closed" };
    }
    await tx.update(adSlots).set({ status: "removed" }).where(eq(adSlots.id, slotId));
    const left = await occupyingLeft(slot.orderId, tx);
    if (left === 0) {
      await tx
        .update(adOrders)
        .set({ status: "removed", updatedAt: new Date() })
        .where(eq(adOrders.id, slot.orderId));
    }
    return { ok: true as const };
  });
}

export async function removeAdOrder(orderId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: adOrders.id })
      .from(adOrders)
      .where(eq(adOrders.id, orderId))
      .limit(1);
    if (!order) return { ok: false as const, error: "Booking not found" };
    await tx
      .update(adSlots)
      .set({ status: "removed" })
      .where(and(eq(adSlots.orderId, orderId), inArray(adSlots.status, [...OCCUPYING])));
    await tx
      .update(adOrders)
      .set({ status: "removed", updatedAt: new Date() })
      .where(eq(adOrders.id, orderId));
    return { ok: true as const };
  });
}

export async function getApprovedAdDestination(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      destinationUrl: adOrders.destinationUrl,
      status: adOrders.status,
      ownerClerkUserId: adOrders.ownerClerkUserId,
      year: adOrders.year,
      month: adOrders.month,
      active: sql<number>`(
        select count(*)::int from ad_slots
        where ad_slots.order_id = ${adOrders.id} and ad_slots.status = 'approved'
      )`,
    })
    .from(adOrders)
    .where(eq(adOrders.id, orderId))
    .limit(1);
  if (!row || row.status !== "approved" || Number(row.active) < 1) return null;
  return row;
}

export async function incrementAdClicks(orderId: string) {
  const db = getDb();
  await db
    .update(adOrders)
    .set({ clickCount: sql`${adOrders.clickCount} + 1` })
    .where(eq(adOrders.id, orderId));
}
