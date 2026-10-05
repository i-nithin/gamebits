import { redirect } from "next/navigation";

import { AdBookingForm } from "@/components/ads/ad-booking-form";
import { getAdOrderForEdit } from "@/lib/ads";
import { monthKey } from "@/lib/ads-month";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function EditAdbitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) redirect("/adbits");

  const { id } = await params;
  if (!isUuid(id)) redirect("/adbits");
  const order = await getAdOrderForEdit(id);
  if (!order || order.ownerClerkUserId !== userId || !order.editable) redirect("/adbits");
  if (order.placement === "carousel") redirect(`/adbits/carousel/${id}/edit`);

  return (
    <AdBookingForm
      mode="user"
      order={{
        id: order.id,
        monthLabel: order.monthLabel,
        slotCount: order.slotCount,
        monthKey: monthKey(order),
      }}
      prefill={order}
    />
  );
}
