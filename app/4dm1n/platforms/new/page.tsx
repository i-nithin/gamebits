import { PlatformForm } from "@/components/admin/platform-form";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function NewAdminPlatformPage() {
  await enforceAdminPage();
  return <PlatformForm />;
}
