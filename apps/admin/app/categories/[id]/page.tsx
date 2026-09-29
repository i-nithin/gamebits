import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/catalog-forms";
import { PageHeader } from "@/components/shell";
import { getCategoryById } from "@gamebits/core/queries";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) notFound();
  return (
    <>
      <PageHeader
        title={category.name}
        action={
          <Link href="/categories" className="text-sm text-fog">
            Back
          </Link>
        }
      />
      <CategoryForm category={category} />
    </>
  );
}
