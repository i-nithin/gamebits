import { AdBookingForm } from "@/components/ads/ad-booking-form";
import { listWeekOptions } from "@/lib/ads";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function NewAdminAdbitsPage() {
  await enforceAdminPage();
  const booking = await listWeekOptions();

  return (
    <AdBookingForm weeks={booking.weeks} monthLabel={booking.monthLabel} mode="admin" />
  );
}

export const metadata = { title: 'Create Adbit', robots: { index: false, follow: false } };
