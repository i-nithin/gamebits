import { AdBookingForm } from "@/components/ads/ad-booking-form";
import { listMonthOptions } from "@/lib/ads";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function NewAdminAdbitsPage() {
  await enforceAdminPage();
  const months = await listMonthOptions();

  return <AdBookingForm months={months} mode="admin" />;
}
