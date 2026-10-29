import { redirect } from "next/navigation";

export default async function NewAdbitsBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ again?: string }>;
}) {
  const { again } = await searchParams;
  redirect(again ? `/adbits/sidebar?again=${encodeURIComponent(again)}` : "/adbits/sidebar");
}

export const metadata = { title: 'Book an Adbit', robots: { index: false, follow: false } };
