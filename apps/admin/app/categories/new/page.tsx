import Link from "next/link";

import { CategoryForm } from "@/components/catalog-forms";
import { PageHeader } from "@/components/shell";

export default function NewCategoryPage() {
  return (
    <>
      <PageHeader
        title="New category"
        action={
          <Link href="/categories" className="text-sm text-fog">
            Back
          </Link>
        }
      />
      <CategoryForm />
    </>
  );
}
