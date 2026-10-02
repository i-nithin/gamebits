import { notFound } from "next/navigation";

import { PlatformForm } from "@/components/admin/platform-form";
import { enforceAdminPage } from "@/lib/auth-admin";
import { getPlatformById } from "@/lib/queries";

export default async function EditAdminPlatformPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await enforceAdminPage();
  const { id } = await params;
  const platform = await getPlatformById(id);
  if (!platform) notFound();

  return <PlatformForm platform={platform} />;
}
