import Link from "next/link";

import { PlatformForm } from "@/components/catalog-forms";
import { PageHeader } from "@/components/shell";

export default function NewPlatformPage() {
  return (
    <>
      <PageHeader
        title="New platform"
        action={
          <Link href="/platforms" className="text-sm text-fog">
            Back
          </Link>
        }
      />
      <PlatformForm />
    </>
  );
}
