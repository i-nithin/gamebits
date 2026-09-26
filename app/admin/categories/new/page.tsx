import { redirect } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";

export default async function NewAdminCategoryPage() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  return <CategoryForm />;
}
