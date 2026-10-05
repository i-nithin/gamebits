import { revalidatePath } from "next/cache";

import { applyDodoWebhook } from "@/lib/ad-payments";
import { getDodo } from "@/lib/dodo";

export const dynamic = "force-dynamic";

function revalidateAds() {
  revalidatePath("/");
  revalidatePath("/adbits");
  revalidatePath("/4dm1n/adbits");
}

export async function POST(request: Request) {
  const raw = await request.text();
  const webhookId = request.headers.get("webhook-id");
  if (!webhookId) {
    return Response.json({ error: "Missing webhook-id" }, { status: 400 });
  }

  let event;
  try {
    event = getDodo().webhooks.unwrap(raw, {
      headers: {
        "webhook-id": webhookId,
        "webhook-signature": request.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      },
    });
  } catch (error) {
    console.error("[dodo] webhook verification failed", error);
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    await applyDodoWebhook(webhookId, event);
    revalidateAds();
    return Response.json({ received: true });
  } catch (error) {
    console.error("[dodo] webhook failed", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
