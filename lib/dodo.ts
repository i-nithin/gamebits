import DodoPayments from "dodopayments";
import { headers } from "next/headers";

import { adProductId } from "@/lib/ad-catalog";
import type { AdPlacement } from "@/lib/ads-types";

export const dodoEnvironment =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";

let client: DodoPayments | null = null;

export function getDodo() {
  if (!client) {
    const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
    if (!bearerToken) {
      throw new Error("DODO_PAYMENTS_API_KEY is not set");
    }
    client = new DodoPayments({
      bearerToken,
      environment: dodoEnvironment,
      webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    });
  }
  return client;
}

export type DodoWebhookEvent = ReturnType<
  InstanceType<typeof DodoPayments>["webhooks"]["unwrap"]
>;

async function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) throw new Error("Missing request host");
  const proto =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function createAdCheckoutSession(input: {
  orderId: string;
  placement: AdPlacement;
  quantity: number;
  email: string;
  name: string | null;
}) {
  const origin = await appOrigin();
  const placementQuery = input.placement === "carousel" ? "&placement=carousel" : "";
  const session = await getDodo().checkoutSessions.create({
    product_cart: [{ product_id: adProductId(input.placement), quantity: input.quantity }],
    customer: {
      email: input.email,
      name: input.name,
    },
    metadata: { order_id: input.orderId },
    return_url: `${origin}/adbits?checkout=return${placementQuery}`,
  });

  if (!session.checkout_url) {
    throw new Error("Checkout URL was not returned");
  }

  return { sessionId: session.session_id, checkoutUrl: session.checkout_url };
}
