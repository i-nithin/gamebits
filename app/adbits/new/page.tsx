import { redirect } from "next/navigation";

import { AdBookingForm } from "@/components/ads/ad-booking-form";
import { getOwnedAdCreative, listMonthOptions } from "@/lib/ads";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { isUuid } from "@/lib/sanitize";

export default async function NewAdbitsBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ again?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountClosed(userId))) redirect("/adbits");

  const { again } = await searchParams;
  const [months, prefill] = await Promise.all([
    listMonthOptions(),
    again && isUuid(again) ? getOwnedAdCreative(userId, again) : Promise.resolve(null),
  ]);

  return <AdBookingForm months={months} prefill={prefill} mode="user" />;
}
