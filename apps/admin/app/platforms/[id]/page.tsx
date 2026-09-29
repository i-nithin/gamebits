import Link from "next/link";
import { notFound } from "next/navigation";

import { PlatformForm } from "@/components/catalog-forms";
import { PageHeader } from "@/components/shell";
import { getPlatformById } from "@gamebits/core/queries";

export default async function EditPlatformPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const platform = await getPlatformById(id);
  if (!platform) notFound();
  return (
    <>
      <PageHeader
        title={platform.name}
        action={
          <Link href="/platforms" className="text-sm text-fog">
            Back
          </Link>
        }
      />
      <PlatformForm platform={platform} />
    </>
  );
}
