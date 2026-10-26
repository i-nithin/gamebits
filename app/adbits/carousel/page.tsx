import { CarouselBookingForm } from "@/components/ads/carousel-booking-form";
import { getAdOrderForEdit, listCarouselGameChoices, listWeekOptions } from "@/lib/ads";
import { getCurrentUserId, isAccountRestricted } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function CarouselAdPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; again?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountRestricted(userId))) return null;

  const { game, again } = await searchParams;
  const [booking, games, againOrder] = await Promise.all([
    listWeekOptions("carousel"),
    listCarouselGameChoices({ userId, admin: false }),
    again && isUuid(again) ? getAdOrderForEdit(again) : Promise.resolve(null),
  ]);
  const owned =
    againOrder && againOrder.ownerClerkUserId === userId && againOrder.placement === "carousel"
      ? againOrder
      : null;

  return (
    <CarouselBookingForm
      mode="user"
      weeks={booking.weeks}
      monthLabel={booking.monthLabel}
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
