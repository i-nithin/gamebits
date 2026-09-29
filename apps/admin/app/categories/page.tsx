import Link from "next/link";

import { archiveCategoryAction } from "@/app/actions/mutations";
import { PageHeader, Stat } from "@/components/shell";
import { listCategoryCatalog } from "@gamebits/core/queries";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "all" } = await searchParams;
  const catalog = await listCategoryCatalog();
  const rows = catalog.filter((category) => {
    if (view === "live") return !category.archivedAt;
    if (view === "archived") return Boolean(category.archivedAt);
    return true;
  });
  const live = catalog.filter((category) => !category.archivedAt).length;

  return (
    <>
      <PageHeader
        title="Categories"
        action={
          <Link href="/categories/new" className="rounded-lg bg-paper px-3 py-2 text-sm font-medium text-void">
            New category
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Catalog" value={catalog.length} />
        <Stat label="Live" value={live} />
        <Stat label="Archived" value={catalog.length - live} />
      </div>
      <div className="flex gap-2 text-sm">
        <Link href="/categories" className={view === "all" ? "text-white" : "text-fog"}>
          All
        </Link>
        <Link href="/categories?view=live" className={view === "live" ? "text-white" : "text-fog"}>
          Live
        </Link>
        <Link href="/categories?view=archived" className={view === "archived" ? "text-white" : "text-fog"}>
          Archived
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wide text-fog uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Games</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((category) => (
              <tr key={category.id} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <Link href={`/categories/${category.id}`} className="text-ice">
                    {category.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">{category.gameCount}</td>
                <td className="px-4 py-3 text-right">
                  <form action={archiveCategoryAction}>
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="archived" value={category.archivedAt ? "false" : "true"} />
                    <button type="submit" className="text-fog hover:text-white">
                      {category.archivedAt ? "Restore" : "Archive"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
