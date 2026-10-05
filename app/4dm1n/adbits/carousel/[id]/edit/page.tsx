import { redirect } from "next/navigation";

import { CarouselBookingForm } from "@/components/ads/carousel-booking-form";
import { getAdOrderForEdit, listCarouselGameChoices } from "@/lib/ads";
import { monthKey } from "@/lib/ads-month";
import { enforceAdminPage, getCurrentUserId } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function EditAdminCarouselAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await enforceAdminPage();
  const adminId = await getCurrentUserId();
  if (!adminId) redirect("/4dm1n/adbits?placement=carousel");
  const { id } = await params;
  if (!isUuid(id)) redirect("/4dm1n/adbits?placement=carousel");
  const order = await getAdOrderForEdit(id);
  if (!order || !order.editable) redirect("/4dm1n/adbits?placement=carousel");
  if (order.placement !== "carousel") redirect(`/4dm1n/adbits/${id}/edit`);

  const games = await listCarouselGameChoices({ userId: adminId, admin: true });

  return (
    <CarouselBookingForm
      mode="admin"
      games={games}
      order={{
        id: order.id,
        monthLabel: order.monthLabel,
        monthKey: monthKey(order),
      }}
      prefill={{
        gameId: order.gameId,
        tagline: order.tagline,
        mediaUrl: order.mediaUrl,
        destinationUrl: order.destinationUrl,
        badge: order.badge,
        countdownEndsAt: order.countdownEndsAt,
      }}
    />
  );
}
