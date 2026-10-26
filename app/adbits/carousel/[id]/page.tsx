import { redirect } from "next/navigation";

import { CarouselBookingForm } from "@/components/ads/carousel-booking-form";
import { getAdOrderForEdit, listCarouselGameChoices } from "@/lib/ads";
import { getCurrentUserId, isAccountRestricted } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function EditCarouselAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountRestricted(userId))) return null;

  const { id } = await params;
  if (!isUuid(id)) redirect("/adbits/carousel");
  const order = await getAdOrderForEdit(id);
  if (!order || order.ownerClerkUserId !== userId || !order.editable) {
    redirect("/adbits/carousel");
  }
  if (order.placement !== "carousel") redirect(`/adbits/sidebar/${id}`);

  const games = await listCarouselGameChoices({ userId, admin: false });

  return (
    <CarouselBookingForm
      mode="user"
      games={games}
      order={{
        id: order.id,
        scheduleLabel: order.scheduleLabel,
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
