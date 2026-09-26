import { notFound, redirect } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { getCategoryById, listCategoryCatalog } from "@/lib/queries";

export default async function EditAdminCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  const { id } = await params;
  const [category, catalog] = await Promise.all([getCategoryById(id), listCategoryCatalog()]);
  if (!category) notFound();
  const gameCount = catalog.find((item) => item.id === id)?.gameCount ?? 0;

  return <CategoryForm category={category} gameCount={gameCount} />;
}
