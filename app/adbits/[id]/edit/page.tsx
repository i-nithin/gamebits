import { redirect } from "next/navigation";

export default async function EditAdbitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/adbits/sidebar/${id}`);
}
