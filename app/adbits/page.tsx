import { redirect } from "next/navigation";

import { getCurrentUserId, isAccountRestricted } from "@/lib/auth-admin";

export default async function AdbitsPage({
  searchParams,
}: {
  searchParams: Promise<{ placement?: string; checkout?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId || (await isAccountRestricted(userId))) return null;

  const params = await searchParams;
  if (params.checkout === "return") redirect("/adbits/history?checkout=return");
  if (params.placement === "carousel") redirect("/adbits/carousel");
  redirect("/adbits/sidebar");
}

export const metadata = { title: 'Advertise', robots: { index: false, follow: false } };
