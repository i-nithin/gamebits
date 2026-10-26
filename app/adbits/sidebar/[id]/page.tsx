import { redirect } from "next/navigation";

import { AdBookingForm } from "@/components/ads/ad-booking-form";
import { getAdOrderForEdit } from "@/lib/ads";
import { getCurrentUserId, isAccountRestricted } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function EditSidebarAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountRestricted(userId))) return null;

  const { id } = await params;
  if (!isUuid(id)) redirect("/adbits/sidebar");
  const order = await getAdOrderForEdit(id);
  if (!order || order.ownerClerkUserId !== userId || !order.editable) redirect("/adbits/sidebar");
  if (order.placement === "carousel") redirect(`/adbits/carousel/${id}`);

  return (
    <AdBookingForm
      mode="user"
      order={{
        id: order.id,
        scheduleLabel: order.scheduleLabel,
      }}
      prefill={order}
    />
  );
}
