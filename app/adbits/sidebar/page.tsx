import { AdBookingForm } from "@/components/ads/ad-booking-form";
import { getOwnedAdCreative, listWeekOptions } from "@/lib/ads";
import { getCurrentUserId, isAccountRestricted } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function SidebarAdPage({
  searchParams,
}: {
  searchParams: Promise<{ again?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountRestricted(userId))) return null;

  const { again } = await searchParams;
  const [booking, prefill] = await Promise.all([
    listWeekOptions(),
    again && isUuid(again) ? getOwnedAdCreative(userId, again) : Promise.resolve(null),
  ]);

  return (
    <AdBookingForm
      weeks={booking.weeks}
      monthLabel={booking.monthLabel}
      prefill={prefill}
      mode="user"
    />
  );
}
