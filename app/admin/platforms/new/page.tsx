import { redirect } from "next/navigation";

import { PlatformForm } from "@/components/admin/platform-form";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";

export default async function NewAdminPlatformPage() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  return <PlatformForm />;
}
