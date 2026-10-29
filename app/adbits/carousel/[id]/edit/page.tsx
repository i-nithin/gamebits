import { redirect } from "next/navigation";

export default async function LegacyEditCarouselAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/adbits/carousel/${id}`);
}

export const metadata = { title: 'Edit Carousel Booking', robots: { index: false, follow: false } };
