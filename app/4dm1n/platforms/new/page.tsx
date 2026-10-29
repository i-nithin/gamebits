import { PlatformForm } from "@/components/admin/platform-form";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function NewAdminPlatformPage() {
  await enforceAdminPage();
  return <PlatformForm />;
}

export const metadata = { title: 'Create Platform', robots: { index: false, follow: false } };
