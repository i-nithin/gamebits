import Link from "next/link";
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <p className="text-xs tracking-wide text-fog uppercase">
          <Link href="/admin" className="hover:text-paper-white">
            Admin
          </Link>
          <span className="px-1.5">/</span>
          <Link href="/admin/platforms" className="hover:text-paper-white">
            Platforms
          </Link>
          <span className="px-1.5">/</span>
          {platform.name}
        </p>
        <h1 className="text-xl font-medium">Edit platform</h1>
      </div>
      <PlatformForm platform={platform} />
    </div>
  );
}
