import { redirect } from "next/navigation";

import { CarouselBookingForm } from "@/components/ads/carousel-booking-form";
import { getAdOrderForEdit, listCarouselGameChoices, listMonthOptions } from "@/lib/ads";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function NewCarouselAdPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; again?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) redirect("/adbits");

  const { game, again } = await searchParams;
  const [months, games, againOrder] = await Promise.all([
    listMonthOptions("carousel"),
    listCarouselGameChoices({ userId, admin: false }),
    again && isUuid(again) ? getAdOrderForEdit(again) : Promise.resolve(null),
  ]);
  const owned =
    againOrder &&
    againOrder.ownerClerkUserId === userId &&
    againOrder.placement === "carousel"
      ? againOrder
      : null;

  return (
    <CarouselBookingForm
      mode="user"
      months={months}
      games={games}
      initialGameId={game && isUuid(game) ? game : null}
      prefill={
        owned
          ? {
              gameId: owned.gameId,
              tagline: owned.tagline,
              mediaUrl: owned.mediaUrl,
              destinationUrl: owned.destinationUrl,
              badge: owned.badge,
              countdownEndsAt: owned.countdownEndsAt,
            }
          : null
      }
    />
  );
}
