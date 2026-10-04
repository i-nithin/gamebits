import { redirect } from "next/navigation";

import { AdBookingForm } from "@/components/ads/ad-booking-form";
import { getAdOrderForEdit } from "@/lib/ads";
import { monthKey } from "@/lib/ads-month";
import { enforceAdminPage } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function EditAdminAdbitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await enforceAdminPage();
  const { id } = await params;
  if (!isUuid(id)) redirect("/4dm1n/adbits");
  const order = await getAdOrderForEdit(id);
  if (!order || !order.editable) redirect("/4dm1n/adbits");

  return (
    <AdBookingForm
      mode="admin"
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
