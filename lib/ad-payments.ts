import { and, eq, inArray, lt } from "drizzle-orm";

import { adOrders, adSlots, dodoWebhookEvents } from "@/db/schema";
import type { DodoWebhookEvent } from "@/lib/dodo";
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

export async function getPayableAdOrder(userId: string, orderId: string) {
  const db = getDb();
  const [row] = await db
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
    .limit(1);
  return row ?? null;
}

function orderIdFromMetadata(metadata: { [key: string]: string | number | boolean } | undefined) {
  const value = metadata?.order_id;
  return typeof value === "string" && isUuid(value) ? value : null;
}

function quantityForProduct(
  cart: Array<{ product_id: string; quantity: number }> | null | undefined,
  productId: string,
) {
  if (!cart) return 0;
  return cart.reduce(
    (sum, item) => (item.product_id === productId ? sum + item.quantity : sum),
    0,
  );
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

async function fulfillPaidOrder(
  tx: Tx,
  input: {
    orderId: string;
    productCart: Array<{ product_id: string; quantity: number }> | null | undefined;
    paymentId: string;
    customerId: string | null;
    amountCents: number;
    currency: string;
  },
) {
  const [order] = await tx
    .select({
      id: adOrders.id,
      status: adOrders.status,
      paymentStatus: adOrders.paymentStatus,
      dodoProductId: adOrders.dodoProductId,
      slotCount: adOrders.slotCount,
      dodoPaymentId: adOrders.dodoPaymentId,
    })
    .from(adOrders)
    .where(eq(adOrders.id, input.orderId))
    .for("update")
    .limit(1);
  if (!order) return;
  if (order.dodoPaymentId === input.paymentId && order.paymentStatus === "paid") return;

  const productId = order.dodoProductId ?? "";
  const quantity = quantityForProduct(input.productCart, productId);
  const onlyExpectedProduct =
    Boolean(productId) &&
    (input.productCart ?? []).every((item) => item.product_id === productId);
  const matches = onlyExpectedProduct && quantity === order.slotCount;
  const now = new Date();
  const payment = {
    dodoPaymentId: input.paymentId,
    dodoCustomerId: input.customerId,
    amountCents: input.amountCents,
    currency: input.currency,
    paidAt: now,
    updatedAt: now,
  };

  if (!matches) {
    console.error("[dodo] payment did not match the booking", {
      orderId: input.orderId,
      productId,
      quantity,
    });
    return;
  }

  if (order.status !== "pending" || order.paymentStatus !== "checkout") {
    if (!order.dodoPaymentId) {
      await tx
        .update(adOrders)
        .set({ ...payment, paymentStatus: "paid" })
        .where(eq(adOrders.id, order.id));
    }
    return;
  }

  await tx
    .update(adSlots)
    .set({ status: "approved" })
    .where(and(eq(adSlots.orderId, order.id), eq(adSlots.status, "pending")));
  await tx
    .update(adOrders)
    .set({
      ...payment,
      status: "approved",
      paymentStatus: "paid",
      reviewedAt: now,
    })
    .where(eq(adOrders.id, order.id));
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

export async function applyDodoWebhook(webhookId: string, event: DodoWebhookEvent) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const claim = await tx
      .insert(dodoWebhookEvents)
      .values({ webhookId, eventType: event.type })
      .onConflictDoNothing()
      .returning({ webhookId: dodoWebhookEvents.webhookId });
    if (claim.length === 0) return;

    if (
      event.type === "payment.succeeded" ||
      event.type === "payment.failed" ||
      event.type === "payment.cancelled"
    ) {
      const payment = event.data;
      const orderId = orderIdFromMetadata(payment.metadata);
      if (!orderId) return;

      if (event.type === "payment.succeeded") {
        await fulfillPaidOrder(tx, {
          orderId,
          productCart: payment.product_cart,
          paymentId: payment.payment_id,
          customerId: payment.customer.customer_id,
          amountCents: payment.total_amount,
          currency: payment.currency,
        });
        return;
      }

      await releaseUnpaidOrder(tx, orderId);
      return;
    }

    if (event.type === "refund.succeeded") {
      await refundOrder(tx, event.data.payment_id);
    }
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
