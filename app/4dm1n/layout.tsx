import { AdminNav } from "@/components/admin/admin-nav";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await enforceAdminPage();
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)]">
      <AdminNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
