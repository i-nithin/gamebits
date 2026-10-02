import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { enforceAdminPage } from "@/lib/auth-admin";
import { getCategoryById, listCategoryCatalog } from "@/lib/queries";

export default async function EditAdminCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await enforceAdminPage();
  const { id } = await params;
  const [category, catalog] = await Promise.all([getCategoryById(id), listCategoryCatalog()]);
  if (!category) notFound();
  const gameCount = catalog.find((item) => item.id === id)?.gameCount ?? 0;

  return <CategoryForm category={category} gameCount={gameCount} />;
}
