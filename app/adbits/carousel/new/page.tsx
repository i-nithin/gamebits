import { redirect } from "next/navigation";

export default async function NewCarouselAdPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; again?: string }>;
}) {
  const { game, again } = await searchParams;
  const search = new URLSearchParams();
  if (game) search.set("game", game);
  if (again) search.set("again", again);
  const query = search.toString();
  redirect(query ? `/adbits/carousel?${query}` : "/adbits/carousel");
}
