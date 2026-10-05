import { notFound } from "next/navigation";

import { CarouselBookingForm } from "@/components/ads/carousel-booking-form";
import { listCarouselGameChoices, listMonthOptions } from "@/lib/ads";
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
  const [months, games] = await Promise.all([
    listMonthOptions("carousel"),
    listCarouselGameChoices({ userId: adminId, admin: true }),
  ]);

  return (
    <CarouselBookingForm
      mode="admin"
      months={months}
      games={games}
      initialGameId={game && isUuid(game) ? game : null}
    />
  );
}
