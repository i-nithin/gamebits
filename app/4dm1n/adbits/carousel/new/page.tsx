import { notFound } from "next/navigation";

import { CarouselBookingForm } from "@/components/ads/carousel-booking-form";
import { listCarouselGameChoices, listWeekOptions } from "@/lib/ads";
import { enforceAdminPage, getCurrentUserId } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function NewAdminCarouselAdPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  await enforceAdminPage();
  const adminId = await getCurrentUserId();
  if (!adminId) notFound();
  const { game } = await searchParams;
  const [booking, games] = await Promise.all([
    listWeekOptions("carousel"),
    listCarouselGameChoices({ userId: adminId, admin: true }),
  ]);

  return (
    <CarouselBookingForm
      mode="admin"
      weeks={booking.weeks}
      monthLabel={booking.monthLabel}
      games={games}
      initialGameId={game && isUuid(game) ? game : null}
    />
  );
}
