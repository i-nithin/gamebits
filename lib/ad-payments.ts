import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { APIError } from "dodopayments";

import { adOrderWeeks, adOrders, adSlots, dodoWebhookEvents } from "@/db/schema";
import { adPaymentMatches } from "@/lib/ad-catalog";
import type { AdPlacement } from "@/lib/ads-types";
import { getDodo, type DodoWebhookEvent } from "@/lib/dodo";
import { getDb } from "@/lib/db";
import { isUuid } from "@/lib/sanitize";

const CHECKOUT_HOLD_MS = 24 * 60 * 60 * 1000;
const OCCUPYING = ["pending", "approved"] as const;

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function attachAdCheckoutSession(orderId: string, sessionId: string) {
  const db = getDb();
  await db
    .update(adOrders)
    .set({ dodoCheckoutSessionId: sessionId, updatedAt: new Date() })
    .where(and(eq(adOrders.id, orderId), eq(adOrders.paymentStatus, "checkout")));
}

const CHECKOUT_IN_FLIGHT = new Set(["succeeded", "processing"]);

export async function checkoutInFlight(orderId: string) {
  const db = getDb();
  const [row] = await db
    .select({ sessionId: adOrders.dodoCheckoutSessionId })
    .from(adOrders)
    .where(eq(adOrders.id, orderId))
    .limit(1);
  if (!row?.sessionId) return false;

  try {
    const status = await getDodo().checkoutSessions.retrieve(row.sessionId);
    return status.payment_status != null && CHECKOUT_IN_FLIGHT.has(status.payment_status);
  } catch (error) {
    console.error("[dodo] could not read the previous checkout", error);
    return false;
  }
}

export async function getPayableAdOrder(userId: string, orderId: string) {
  const db = getDb();
  const [[row], weeks] = await Promise.all([
    db
      .select({
        id: adOrders.id,
        placement: adOrders.placement,
        slotCount: adOrders.slotCount,
      })
      .from(adOrders)
      .where(
        and(
          eq(adOrders.id, orderId),
          eq(adOrders.ownerClerkUserId, userId),
          eq(adOrders.status, "pending"),
          eq(adOrders.paymentStatus, "checkout"),
        ),
      )
      .limit(1),
    db
      .select({ weekStart: adOrderWeeks.weekStart })
      .from(adOrderWeeks)
      .where(eq(adOrderWeeks.orderId, orderId)),
  ]);
  if (!row) return null;
  return {
    id: row.id,
    placement: row.placement,
    quantity: weeks.length > 0 ? weeks.length : row.slotCount,
  };
}

function orderIdFromMetadata(metadata: { [key: string]: string | number | boolean } | undefined) {
  const value = metadata?.order_id;
  return typeof value === "string" && isUuid(value) ? value : null;
}

type PaymentCapture = {
  orderId: string;
  productCart: Array<{ product_id: string; quantity: number }> | null | undefined;
  paymentId: string;
  checkoutSessionId: string | null;
  customerId: string | null;
  amountCents: number;
  currency: string;
};

class WebhookRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookRetryError";
  }
}

async function releaseUnpaidOrder(tx: Tx, orderId: string) {
  const [order] = await tx
    .select({
      id: adOrders.id,
      status: adOrders.status,
      paymentStatus: adOrders.paymentStatus,
    })
    .from(adOrders)
    .where(eq(adOrders.id, orderId))
    .for("update")
    .limit(1);
  if (!order || order.paymentStatus !== "checkout" || order.status !== "pending") return false;

  const now = new Date();
  await tx
    .update(adSlots)
    .set({ status: "removed" })
    .where(and(eq(adSlots.orderId, orderId), eq(adSlots.status, "pending")));
  await tx
    .update(adOrders)
    .set({ status: "removed", paymentStatus: "failed", updatedAt: now })
    .where(eq(adOrders.id, orderId));
  return true;
}

function isAdPlacement(value: string): value is AdPlacement {
  return value === "sidebar" || value === "carousel";
}

function isAlreadyRefunded(error: unknown) {
  if (!(error instanceof APIError)) return false;
  return error.status === 409 || error.message.toLowerCase().includes("already");
}

async function refundCapturedPayment(paymentId: string) {
  try {
    await getDodo().refunds.create({ payment_id: paymentId });
  } catch (error) {
    if (isAlreadyRefunded(error)) return;
    console.error("[dodo] refund failed", paymentId, error);
    throw error;
  }
}

async function rememberUnfulfilledPayment(tx: Tx, orderId: string, input: PaymentCapture, release: boolean) {
  const now = new Date();
  if (release) {
    await tx
      .update(adSlots)
      .set({ status: "removed" })
      .where(and(eq(adSlots.orderId, orderId), eq(adSlots.status, "pending")));
  }
  await tx
    .update(adOrders)
    .set({
      dodoPaymentId: input.paymentId,
      dodoCustomerId: input.customerId,
      amountCents: input.amountCents,
      currency: input.currency,
      updatedAt: now,
      ...(release ? { status: "removed" as const, paymentStatus: "failed" as const } : {}),
    })
    .where(eq(adOrders.id, orderId));
}

async function fulfillPaidOrder(tx: Tx, input: PaymentCapture) {
  const [order] = await tx
    .select({
      id: adOrders.id,
      placement: adOrders.placement,
      status: adOrders.status,
      paymentStatus: adOrders.paymentStatus,
      dodoProductId: adOrders.dodoProductId,
      dodoCheckoutSessionId: adOrders.dodoCheckoutSessionId,
      slotCount: adOrders.slotCount,
      dodoPaymentId: adOrders.dodoPaymentId,
    })
    .from(adOrders)
    .where(eq(adOrders.id, input.orderId))
    .for("update")
    .limit(1);
  if (!order) throw new WebhookRetryError("Payment webhook order was not found");

  if (order.dodoPaymentId === input.paymentId && order.paymentStatus === "paid" && order.status === "approved") {
    return null;
  }
  if (order.dodoPaymentId === input.paymentId && order.paymentStatus === "refunded") return null;

  const staleSession =
    Boolean(input.checkoutSessionId) &&
    Boolean(order.dodoCheckoutSessionId) &&
    input.checkoutSessionId !== order.dodoCheckoutSessionId;
  if (staleSession || (order.dodoPaymentId && order.dodoPaymentId !== input.paymentId)) {
    console.error("[dodo] payment needs review", {
      orderId: order.id,
      paymentId: input.paymentId,
      reason: staleSession ? "replaced checkout" : "duplicate payment",
    });
    return input.paymentId;
  }

  const weekRows = await tx
    .select({ weekStart: adOrderWeeks.weekStart })
    .from(adOrderWeeks)
    .where(eq(adOrderWeeks.orderId, order.id));
  const expectedQuantity = weekRows.length > 0 ? weekRows.length : order.slotCount;
  const placement = isAdPlacement(order.placement) ? order.placement : null;
  const matches =
    placement != null &&
    adPaymentMatches({
      productId: order.dodoProductId ?? "",
      expectedQuantity,
      cart: input.productCart,
      amountCents: input.amountCents,
      currency: input.currency,
      placement,
    });
  const open = order.status === "pending" && order.paymentStatus === "checkout";

  if (matches && open) {
    const now = new Date();
    await tx
      .update(adSlots)
      .set({ status: "approved" })
      .where(and(eq(adSlots.orderId, order.id), eq(adSlots.status, "pending")));
    await tx
      .update(adOrders)
      .set({
        dodoPaymentId: input.paymentId,
        dodoCustomerId: input.customerId,
        amountCents: input.amountCents,
        currency: input.currency,
        paidAt: now,
        updatedAt: now,
        status: "approved",
        paymentStatus: "paid",
        reviewedAt: now,
      })
      .where(eq(adOrders.id, order.id));
    return null;
  }

  console.error("[dodo] payment needs review", {
    orderId: order.id,
    paymentId: input.paymentId,
    reason: matches ? "booking is not open" : "cart or amount mismatch",
    amountCents: input.amountCents,
    currency: input.currency,
  });
  const canRecord =
    open || order.status === "removed" || order.paymentStatus === "failed";
  if (canRecord && !order.dodoPaymentId) {
    await rememberUnfulfilledPayment(tx, order.id, input, open);
  }
  return input.paymentId;
}

async function refundOrder(tx: Tx, paymentId: string) {
  const [order] = await tx
    .select({ id: adOrders.id, paymentStatus: adOrders.paymentStatus })
    .from(adOrders)
    .where(eq(adOrders.dodoPaymentId, paymentId))
    .for("update")
    .limit(1);
  if (!order || order.paymentStatus === "refunded") return;

  const now = new Date();
  await tx
    .update(adSlots)
    .set({ status: "removed" })
    .where(and(eq(adSlots.orderId, order.id), inArray(adSlots.status, [...OCCUPYING])));
  await tx
    .update(adOrders)
    .set({ status: "removed", paymentStatus: "refunded", updatedAt: now })
    .where(eq(adOrders.id, order.id));
}

async function prepareDodoEvent(tx: Tx, event: DodoWebhookEvent) {
  if (
    event.type === "payment.succeeded" ||
    event.type === "payment.failed" ||
    event.type === "payment.cancelled"
  ) {
    const payment = event.data;
    const orderId = orderIdFromMetadata(payment.metadata);
    if (!orderId) throw new WebhookRetryError("Payment webhook is missing order_id");

    if (event.type !== "payment.succeeded") {
      const [order] = await tx
        .select({ id: adOrders.id })
        .from(adOrders)
        .where(eq(adOrders.id, orderId))
        .limit(1);
      if (!order) throw new WebhookRetryError("Payment webhook order was not found");
      await releaseUnpaidOrder(tx, orderId);
      return null;
    }

    const checkoutSessionId =
      "checkout_session_id" in payment && typeof payment.checkout_session_id === "string"
        ? payment.checkout_session_id
        : null;
    return fulfillPaidOrder(tx, {
      orderId,
      productCart: payment.product_cart,
      paymentId: payment.payment_id,
      checkoutSessionId,
      customerId: payment.customer.customer_id,
      amountCents: payment.total_amount,
      currency: payment.currency,
    });
  }

  if (event.type === "refund.succeeded") {
    await refundOrder(tx, event.data.payment_id);
  }
  return null;
}

export async function applyDodoWebhook(webhookId: string, event: DodoWebhookEvent) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${webhookId})::bigint)`);
    const [existing] = await tx
      .select({ webhookId: dodoWebhookEvents.webhookId })
      .from(dodoWebhookEvents)
      .where(eq(dodoWebhookEvents.webhookId, webhookId))
      .limit(1);
    if (existing) return;

    const refundPaymentId = await prepareDodoEvent(tx, event);
    if (refundPaymentId) await refundCapturedPayment(refundPaymentId);

    await tx
      .insert(dodoWebhookEvents)
      .values({ webhookId, eventType: event.type })
      .onConflictDoNothing();
  });
}

export async function expireAdCheckouts(now = new Date()) {
  const db = getDb();
  const cutoff = new Date(now.getTime() - CHECKOUT_HOLD_MS);
  const stale = await db
    .select({ id: adOrders.id })
    .from(adOrders)
    .where(
      and(
        eq(adOrders.paymentStatus, "checkout"),
        eq(adOrders.status, "pending"),
        lt(adOrders.updatedAt, cutoff),
      ),
    );

  let expired = 0;
  for (const order of stale) {
    const released = await db.transaction((tx) => releaseUnpaidOrder(tx, order.id));
    if (released) expired += 1;
  }
  return expired;
}
