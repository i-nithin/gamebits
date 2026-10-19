import { redirect } from "next/navigation";

export default async function LaunchGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/games/${slug}?launch=1`);
}
