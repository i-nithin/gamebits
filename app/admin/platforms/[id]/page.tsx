import { notFound, redirect } from "next/navigation";

import { PlatformForm } from "@/components/admin/platform-form";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { getPlatformById } from "@/lib/queries";

export default async function EditAdminPlatformPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  const { id } = await params;
  const platform = await getPlatformById(id);
  if (!platform) notFound();

  return <PlatformForm platform={platform} />;
}
