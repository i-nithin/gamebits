import { redirect } from "next/navigation";

import { CarouselBookingForm } from "@/components/ads/carousel-booking-form";
import { getAdOrderForEdit, listCarouselGameChoices } from "@/lib/ads";
import { monthKey } from "@/lib/ads-month";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function EditCarouselAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) redirect("/adbits");

  const { id } = await params;
  if (!isUuid(id)) redirect("/adbits?placement=carousel");
  const order = await getAdOrderForEdit(id);
  if (!order || order.ownerClerkUserId !== userId || !order.editable) {
    redirect("/adbits?placement=carousel");
  }
  if (order.placement !== "carousel") redirect(`/adbits/${id}/edit`);

  const games = await listCarouselGameChoices({ userId, admin: false });

  return (
    <CarouselBookingForm
      mode="user"
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
