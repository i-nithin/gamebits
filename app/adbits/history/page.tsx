import { AdHistory } from "@/components/ads/ad-history";
import { listUserAdOrders } from "@/lib/ads";
import { getCurrentUserId, isAccountRestricted } from "@/lib/auth-admin";

export default async function AdHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountRestricted(userId))) return null;

  const params = await searchParams;
  const orders = await listUserAdOrders(userId);
  return <AdHistory orders={orders} checkoutReturn={params.checkout === "return"} />;
}

export const metadata = { title: 'Ad Booking History', robots: { index: false, follow: false } };
