import { CategoryForm } from "@/components/admin/category-form";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function NewAdminCategoryPage() {
  await enforceAdminPage();
  return <CategoryForm />;
}
