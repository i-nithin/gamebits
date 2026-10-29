import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { adOrderWeeks, adOrders, adSlots, games, profiles } from "@/db/schema";
import type { AdPaymentStatus } from "@/lib/ad-catalog";
import {
  AD_PHASE_LABELS,
  currentPacificMonth,
  formatMonthLabel,
  formatPacificInstant,
  liveWindowLabel,
  monthKey,
  monthWindow,
  type PacificMonth,
} from "@/lib/ads-month";
import type {
  AdOrderRecord,
  AdPlacement,
  CarouselAd,
  CarouselGameChoice,
  MonthOption,
  SidebarAd,
  WeekOption,
} from "@/lib/ads-types";
import {
  bookingPhase,
  currentPacificWeekStart,
  dateKey,
  formatScheduleLabel,
  formatWeekRange,
  nextMonthLabel,
  nextMonthWeeks,
  resolveOpenWeeks,
  weekKey,
} from "@/lib/ads-week";
import { AD_MONTH_WINDOW, AD_SLOT_CAP, type CarouselBadge, type IarcRating } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { r2PublicBaseUrl } from "@/lib/cloudflare-r2";

const OCCUPYING = ["pending", "approved"] as const;

export { AD_PHASE_LABELS };

function legacyMonthSql() {
  return sql`not exists (
    select 1 from ad_order_weeks
    where ad_order_weeks.order_id = ${adOrders.id}
  )`;
}

function currentWeekSql(week: string) {
  return sql`exists (
    select 1 from ad_order_weeks
    where ad_order_weeks.order_id = ${adOrders.id}
      and ad_order_weeks.week_start = ${week}::date
  )`;
}

function liveWindowSql(now = new Date()) {
  const month = currentPacificMonth(now);
  const week = weekKey(currentPacificWeekStart(now));
  return or(
    and(eq(adOrders.year, month.year), eq(adOrders.month, month.month), legacyMonthSql()),
    currentWeekSql(week),
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

export async function listMonthOptions(
  placement: AdPlacement = "sidebar",
  now = new Date(),
): Promise<MonthOption[]> {
  const months = monthWindow(AD_MONTH_WINDOW, now);
  const db = getDb();
  const rows = await db
    .select({
      year: adOrders.year,
      month: adOrders.month,
      booked: sql<number>`count(distinct ${adOrders.id})::int`,
    })
    .from(adSlots)
    .innerJoin(adOrders, eq(adSlots.orderId, adOrders.id))
    .where(
      and(
        eq(adOrders.placement, placement),
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
      full: false,
      windowLabel: liveWindowLabel(month),
    };
  });
}

type SeatDb = Pick<ReturnType<typeof getDb>, "select">;

async function seatsByWeek(
  db: SeatDb,
  placement: AdPlacement,
  year: number,
  month: number,
  weekStarts: string[],
) {
  const [weeklyRows, legacyRows] = await Promise.all([
    db
      .select({
        weekStart: adOrderWeeks.weekStart,
        booked: sql<number>`count(*)::int`,
      })
      .from(adSlots)
      .innerJoin(adOrders, eq(adSlots.orderId, adOrders.id))
      .innerJoin(adOrderWeeks, eq(adOrderWeeks.orderId, adOrders.id))
      .where(
        and(
          eq(adOrders.placement, placement),
          inArray(adOrderWeeks.weekStart, weekStarts),
          inArray(adSlots.status, [...OCCUPYING]),
        ),
      )
      .groupBy(adOrderWeeks.weekStart),
    db
      .select({ booked: sql<number>`count(*)::int` })
      .from(adSlots)
      .innerJoin(adOrders, eq(adSlots.orderId, adOrders.id))
      .where(
        and(
          eq(adOrders.placement, placement),
          eq(adOrders.year, year),
          eq(adOrders.month, month),
          inArray(adSlots.status, [...OCCUPYING]),
          legacyMonthSql(),
        ),
      ),
  ]);

  const weekly = new Map(weeklyRows.map((row) => [dateKey(row.weekStart), Number(row.booked)]));
  const legacy = Number(legacyRows[0]?.booked ?? 0);
  return new Map(weekStarts.map((week) => [week, (weekly.get(week) ?? 0) + legacy]));
}

export async function listWeekOptions(
  placement: AdPlacement = "sidebar",
  now = new Date(),
): Promise<{ monthLabel: string; weeks: WeekOption[] }> {
  const weeks = nextMonthWeeks(now);
  const monthLabel = nextMonthLabel(now);
  if (weeks.length === 0) return { monthLabel, weeks: [] };
  const keys = weeks.map(weekKey);
  const seats = await seatsByWeek(
    getDb(),
    placement,
    weeks[0].year,
    weeks[0].month,
    keys,
  );
  return {
    monthLabel,
    weeks: weeks.map((week) => {
      const key = weekKey(week);
      const booked = seats.get(key) ?? 0;
      return {
        key,
        label: formatWeekRange(week),
        booked,
        cap: AD_SLOT_CAP,
        full: booked >= AD_SLOT_CAP,
      };
    }),
  };
}

export async function listLiveSidebarAds(now = new Date()): Promise<SidebarAd[]> {
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
        eq(adOrders.format, "brand"),
        eq(adOrders.status, "approved"),
        inArray(adOrders.paymentStatus, ["paid", "waived"]),
        eq(adSlots.status, "approved"),
        liveWindowSql(now),
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

function numericAverage(value: number | string | null) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function listLiveCarouselAds(now = new Date()): Promise<CarouselAd[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: adOrders.id,
      destinationUrl: adOrders.destinationUrl,
      mediaUrl: adOrders.mediaUrl,
      tagline: adOrders.tagline,
      badge: adOrders.badge,
      countdownEndsAt: adOrders.countdownEndsAt,
      gameName: games.name,
      developerName: games.developerName,
      iarcRating: games.iarcRating,
      reviewAverage: sql<number | null>`(select avg(game_reviews.rating) from game_reviews where game_reviews.game_id = ${games.id})`,
      reviewCount: sql<number>`(select count(*)::int from game_reviews where game_reviews.game_id = ${games.id})`,
    })
    .from(adOrders)
    .innerJoin(games, eq(games.id, adOrders.gameId))
    .where(
      and(
        eq(adOrders.placement, "carousel"),
        eq(adOrders.status, "approved"),
        inArray(adOrders.paymentStatus, ["paid", "waived"]),
        liveWindowSql(now),
        isNull(games.archivedAt),
        sql`exists (
          select 1 from ad_slots
          where ad_slots.order_id = ad_orders.id and ad_slots.status = 'approved'
        )`,
      ),
    )
    .orderBy(adOrders.bookedAt);

  return rows.flatMap((row) => {
    if (!row.mediaUrl || !row.iarcRating) return [];
    return [
      {
        id: row.id,
        destinationUrl: row.destinationUrl,
        mediaUrl: row.mediaUrl,
        tagline: row.tagline,
        badge: row.badge,
        countdownEndsAt: row.countdownEndsAt ? row.countdownEndsAt.toISOString() : null,
        gameName: row.gameName,
        developerName: row.developerName,
        iarcRating: row.iarcRating,
        reviewAverage: numericAverage(row.reviewAverage),
        reviewCount: Number(row.reviewCount),
      },
    ];
  });
}

export async function listCarouselGameChoices(opts: {
  userId: string;
  admin: boolean;
}): Promise<CarouselGameChoice[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: games.id,
      slug: games.slug,
      name: games.name,
      developerName: games.developerName,
      logoUrl: games.logoUrl,
      iarcRating: games.iarcRating,
      reviewAverage: sql<number | null>`(select avg(game_reviews.rating) from game_reviews where game_reviews.game_id = ${games.id})`,
      reviewCount: sql<number>`(select count(*)::int from game_reviews where game_reviews.game_id = ${games.id})`,
    })
    .from(games)
    .where(
      opts.admin
        ? isNull(games.archivedAt)
        : and(isNull(games.archivedAt), eq(games.ownerClerkUserId, opts.userId)),
    )
    .orderBy(asc(games.name));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    developerName: row.developerName,
    logoUrl: row.logoUrl,
    iarcRating: row.iarcRating,
    reviewAverage: numericAverage(row.reviewAverage),
    reviewCount: Number(row.reviewCount),
  }));
}

type OrderRow = {
  id: string;
  placement: AdPlacement;
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
  paymentStatus: AdPaymentStatus;
  amountCents: number | null;
  currency: string | null;
  dodoPaymentId: string | null;
  bookedAt: Date;
  clickCount: number;
  ownerName: string;
  ownerHandle: string;
  gameId: string | null;
  gameName: string | null;
  gameSlug: string | null;
  developerName: string | null;
  iarcRating: IarcRating | null;
  badge: CarouselBadge | null;
  countdownEndsAt: Date | null;
  slotId: string;
  slotStatus: "pending" | "approved" | "rejected" | "removed";
};

function groupOrders(
  rows: OrderRow[],
  weeksByOrder: Map<string, string[]>,
  now = new Date(),
): AdOrderRecord[] {
  const orders = new Map<string, AdOrderRecord>();
  for (const row of rows) {
    let order = orders.get(row.id);
    if (!order) {
      const month = { year: row.year, month: row.month };
      const monthLabel = formatMonthLabel(month);
      const weekStarts = weeksByOrder.get(row.id) ?? [];
      order = {
        id: row.id,
        placement: row.placement,
        format: row.format,
        year: row.year,
        month: row.month,
        monthLabel,
        gameId: row.gameId,
        gameName: row.gameName,
        gameSlug: row.gameSlug,
        developerName: row.developerName,
        iarcRating: row.iarcRating,
        badge: row.badge,
        countdownEndsAt: row.countdownEndsAt ? row.countdownEndsAt.toISOString() : null,
        logoUrl: row.logoUrl,
        productName: row.productName,
        tagline: row.tagline,
        mediaUrl: row.mediaUrl,
        destinationUrl: row.destinationUrl,
        slotCount: row.slotCount,
        activeSlots: 0,
        weekStarts,
        scheduleLabel: formatScheduleLabel({
          monthLabel,
          slotCount: row.slotCount,
          weekStarts,
        }),
        status: row.status,
        phase: "pending",
        paymentStatus: row.paymentStatus,
        amountCents: row.amountCents,
        currency: row.currency,
        dodoPaymentId: row.dodoPaymentId,
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
    order.phase = bookingPhase(
      order.status,
      { year: order.year, month: order.month },
      order.activeSlots,
      order.weekStarts,
      now,
    );
  }
  return [...orders.values()];
}

async function weeksForOrders(orderIds: string[]) {
  const weeks = new Map<string, string[]>();
  if (orderIds.length === 0) return weeks;
  const db = getDb();
  const rows = await db
    .select({
      orderId: adOrderWeeks.orderId,
      weekStart: adOrderWeeks.weekStart,
    })
    .from(adOrderWeeks)
    .where(inArray(adOrderWeeks.orderId, orderIds))
    .orderBy(asc(adOrderWeeks.weekStart));
  for (const row of rows) {
    const list = weeks.get(row.orderId) ?? [];
    list.push(dateKey(row.weekStart));
    weeks.set(row.orderId, list);
  }
  return weeks;
}

async function listOrders(
  where: ReturnType<typeof eq> | ReturnType<typeof and>,
  now = new Date(),
) {
  const db = getDb();
  const rows = await db
    .select({
      id: adOrders.id,
      placement: adOrders.placement,
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
      paymentStatus: adOrders.paymentStatus,
      amountCents: adOrders.amountCents,
      currency: adOrders.currency,
      dodoPaymentId: adOrders.dodoPaymentId,
      bookedAt: adOrders.bookedAt,
      clickCount: adOrders.clickCount,
      ownerName: profiles.name,
      ownerHandle: profiles.handle,
      gameId: adOrders.gameId,
      gameName: games.name,
      gameSlug: games.slug,
      developerName: games.developerName,
      iarcRating: games.iarcRating,
      badge: adOrders.badge,
      countdownEndsAt: adOrders.countdownEndsAt,
      slotId: adSlots.id,
      slotStatus: adSlots.status,
    })
    .from(adOrders)
    .innerJoin(adSlots, eq(adSlots.orderId, adOrders.id))
    .innerJoin(profiles, eq(profiles.clerkUserId, adOrders.ownerClerkUserId))
    .leftJoin(games, eq(games.id, adOrders.gameId))
    .where(where)
    .orderBy(desc(adOrders.bookedAt), adSlots.createdAt);
  const weeks = await weeksForOrders([...new Set(rows.map((row) => row.id))]);
  return groupOrders(rows, weeks, now);
}

export function listUserAdOrders(userId: string) {
  return listOrders(eq(adOrders.ownerClerkUserId, userId));
}

export function listAdminAdOrders(month: PacificMonth, placement: AdPlacement = "sidebar") {
  return listOrders(
    and(
      eq(adOrders.placement, placement),
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
      placement: adOrders.placement,
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
      gameId: adOrders.gameId,
      badge: adOrders.badge,
      countdownEndsAt: adOrders.countdownEndsAt,
    })
    .from(adOrders)
    .where(eq(adOrders.id, orderId))
    .limit(1);
  if (!row) return null;

  const [[activeRow], weekRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(adSlots)
      .where(and(eq(adSlots.orderId, orderId), inArray(adSlots.status, [...OCCUPYING]))),
    db
      .select({ weekStart: adOrderWeeks.weekStart })
      .from(adOrderWeeks)
      .where(eq(adOrderWeeks.orderId, orderId))
      .orderBy(asc(adOrderWeeks.weekStart)),
  ]);
  const activeSlots = Number(activeRow?.count ?? 0);
  const weekStarts = weekRows.map((week) => dateKey(week.weekStart));
  const month = { year: row.year, month: row.month };
  const monthLabel = formatMonthLabel(month);
  const phase = bookingPhase(row.status, month, activeSlots, weekStarts);
  return {
    ...row,
    countdownEndsAt: row.countdownEndsAt ? row.countdownEndsAt.toISOString() : null,
    activeSlots,
    weekStarts,
    phase,
    monthLabel,
    scheduleLabel: formatScheduleLabel({ monthLabel, slotCount: row.slotCount, weekStarts }),
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
  destinationUrl: string;
  logoUrl: string | null;
  productName: string | null;
  tagline: string | null;
  mediaUrl: string | null;
};

type AdPaymentInsert =
  | { status: "waived" }
  | { status: "checkout"; productId: string };

async function reserveWeeks(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  placement: AdPlacement,
  year: number,
  month: number,
  weekStarts: string[],
) {
  const lockKey = placement === "carousel" ? 84215046 : 84215045;
  await tx.execute(sql`select pg_advisory_xact_lock(${lockKey}, ${year * 12 + month})`);
  const open = resolveOpenWeeks(weekStarts);
  if (!open.ok || open.year !== year || open.month !== month) {
    return { ok: false as const, error: "That week is not open for booking" };
  }
  const seats = await seatsByWeek(tx, placement, year, month, open.weekStarts);
  if (open.weekStarts.some((week) => (seats.get(week) ?? 0) + 1 > AD_SLOT_CAP)) {
    return { ok: false as const, error: "One of those weeks is full" };
  }
  return { ok: true as const, weekStarts: open.weekStarts };
}

export async function createAdOrder(input: {
  ownerClerkUserId: string;
  creative: CreativeInsert;
  weekStarts: string[];
  status: "pending" | "approved";
  reviewedByClerkUserId: string | null;
  payment: AdPaymentInsert;
}) {
  const opened = resolveOpenWeeks(input.weekStarts);
  if (!opened.ok) return opened;
  const { creative } = input;

  const db = getDb();
  return db.transaction(async (tx) => {
    const reserved = await reserveWeeks(tx, "sidebar", opened.year, opened.month, opened.weekStarts);
    if (!reserved.ok) return reserved;

    const now = new Date();
    const [order] = await tx
      .insert(adOrders)
      .values({
        placement: "sidebar",
        format: creative.format,
        year: opened.year,
        month: opened.month,
        ownerClerkUserId: input.ownerClerkUserId,
        logoUrl: creative.logoUrl,
        productName: creative.productName,
        tagline: creative.tagline,
        mediaUrl: creative.mediaUrl,
        destinationUrl: creative.destinationUrl,
        slotCount: 1,
        status: input.status,
        paymentStatus: input.payment.status,
        dodoProductId: input.payment.status === "checkout" ? input.payment.productId : null,
        reviewedAt: input.status === "approved" ? now : null,
        reviewedByClerkUserId: input.reviewedByClerkUserId,
      })
      .returning({ id: adOrders.id });

    await tx.insert(adSlots).values({ orderId: order.id, status: input.status });
    await tx.insert(adOrderWeeks).values(
      reserved.weekStarts.map((weekStart) => ({ orderId: order.id, weekStart })),
    );
    return {
      ok: true as const,
      id: order.id,
      year: opened.year,
      month: opened.month,
      weekCount: reserved.weekStarts.length,
    };
  });
}

export async function createCarouselAdOrder(input: {
  ownerClerkUserId: string;
  weekStarts: string[];
  destinationUrl: string;
  tagline: string | null;
  mediaUrl: string;
  gameId: string;
  badge: CarouselBadge | null;
  countdownEndsAt: Date | null;
  status: "pending" | "approved";
  reviewedByClerkUserId: string | null;
  payment: AdPaymentInsert;
}) {
  const opened = resolveOpenWeeks(input.weekStarts);
  if (!opened.ok) return opened;

  const db = getDb();
  return db.transaction(async (tx) => {
    const reserved = await reserveWeeks(tx, "carousel", opened.year, opened.month, opened.weekStarts);
    if (!reserved.ok) return reserved;

    const now = new Date();
    const [order] = await tx
      .insert(adOrders)
      .values({
        placement: "carousel",
        format: "media",
        year: opened.year,
        month: opened.month,
        ownerClerkUserId: input.ownerClerkUserId,
        logoUrl: null,
        productName: null,
        tagline: input.tagline,
        mediaUrl: input.mediaUrl,
        gameId: input.gameId,
        badge: input.badge,
        countdownEndsAt: input.countdownEndsAt,
        destinationUrl: input.destinationUrl,
        slotCount: 1,
        status: input.status,
        paymentStatus: input.payment.status,
        dodoProductId: input.payment.status === "checkout" ? input.payment.productId : null,
        reviewedAt: input.status === "approved" ? now : null,
        reviewedByClerkUserId: input.reviewedByClerkUserId,
      })
      .returning({ id: adOrders.id });

    await tx.insert(adSlots).values({ orderId: order.id, status: input.status });
    await tx.insert(adOrderWeeks).values(
      reserved.weekStarts.map((weekStart) => ({ orderId: order.id, weekStart })),
    );
    return {
      ok: true as const,
      id: order.id,
      year: opened.year,
      month: opened.month,
      weekCount: reserved.weekStarts.length,
    };
  });
}

export async function updateCarouselCreative(
  orderId: string,
  creative: {
    destinationUrl: string;
    tagline: string | null;
    mediaUrl: string;
    gameId: string;
    badge: CarouselBadge | null;
    countdownEndsAt: Date | null;
  },
) {
  const order = await getAdOrderForEdit(orderId);
  if (!order) return { ok: false as const, error: "Booking not found" };
  if (order.placement !== "carousel") {
    return { ok: false as const, error: "Booking not found" };
  }
  if (!order.editable) {
    return { ok: false as const, error: "This booking can no longer be edited" };
  }

  const db = getDb();
  await db
    .update(adOrders)
    .set({
      destinationUrl: creative.destinationUrl,
      tagline: creative.tagline,
      mediaUrl: creative.mediaUrl,
      gameId: creative.gameId,
      badge: creative.badge,
      countdownEndsAt: creative.countdownEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(adOrders.id, orderId));
  return { ok: true as const };
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
      .select({
        id: adOrders.id,
        status: adOrders.status,
        paymentStatus: adOrders.paymentStatus,
      })
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
      .set({
        status: "removed",
        paymentStatus: order.paymentStatus === "checkout" ? "failed" : order.paymentStatus,
        updatedAt: now,
      })
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
      .select({
        id: adOrders.id,
        status: adOrders.status,
        paymentStatus: adOrders.paymentStatus,
      })
      .from(adOrders)
      .where(eq(adOrders.id, orderId))
      .limit(1);
    if (!order || order.status !== "pending") {
      return { ok: false as const, error: "That booking is no longer pending" };
    }
    if (order.paymentStatus === "checkout") {
      return { ok: false as const, error: "That booking is waiting for payment" };
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
      const [order] = await tx
        .select({ paymentStatus: adOrders.paymentStatus })
        .from(adOrders)
        .where(eq(adOrders.id, slot.orderId))
        .limit(1);
      await tx
        .update(adOrders)
        .set({
          status: "removed",
          paymentStatus: order?.paymentStatus === "checkout" ? "failed" : order?.paymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(adOrders.id, slot.orderId));
    }
    return { ok: true as const };
  });
}

export async function removeAdOrder(orderId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: adOrders.id, paymentStatus: adOrders.paymentStatus })
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
      .set({
        status: "removed",
        paymentStatus: order.paymentStatus === "checkout" ? "failed" : order.paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(adOrders.id, orderId));
    return { ok: true as const };
  });
}

export async function getApprovedAdDestination(orderId: string) {
  const db = getDb();
  const [[row], weekRows] = await Promise.all([
    db
      .select({
        destinationUrl: adOrders.destinationUrl,
        status: adOrders.status,
        ownerClerkUserId: adOrders.ownerClerkUserId,
        year: adOrders.year,
        month: adOrders.month,
        active: sql<number>`(
          select count(*)::int from ad_slots
          where ad_slots.order_id = ad_orders.id and ad_slots.status = 'approved'
        )`,
      })
      .from(adOrders)
      .where(
        and(
          eq(adOrders.id, orderId),
          inArray(adOrders.paymentStatus, ["paid", "waived"]),
        ),
      )
      .limit(1),
    db
      .select({ weekStart: adOrderWeeks.weekStart })
      .from(adOrderWeeks)
      .where(eq(adOrderWeeks.orderId, orderId))
      .orderBy(asc(adOrderWeeks.weekStart)),
  ]);
  if (!row || row.status !== "approved" || Number(row.active) < 1) return null;
  return {
    ...row,
    weekStarts: weekRows.map((week) => dateKey(week.weekStart)),
  };
}

export async function incrementAdClicks(orderId: string) {
  const db = getDb();
  await db
    .update(adOrders)
    .set({ clickCount: sql`${adOrders.clickCount} + 1` })
    .where(eq(adOrders.id, orderId));
}
