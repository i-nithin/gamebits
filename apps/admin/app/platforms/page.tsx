import Link from "next/link";

import { archivePlatformAction } from "@/app/actions/mutations";
import { PageHeader, Stat } from "@/components/shell";
import { listPlatformCatalog } from "@gamebits/core/queries";

export default async function PlatformsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "all" } = await searchParams;
  const catalog = await listPlatformCatalog();
  const rows = catalog.filter((platform) => {
    if (view === "live") return !platform.archivedAt;
    if (view === "archived") return Boolean(platform.archivedAt);
    return true;
  });
  const live = catalog.filter((platform) => !platform.archivedAt).length;

  return (
    <>
      <PageHeader
        title="Platforms"
        action={
          <Link href="/platforms/new" className="rounded-lg bg-paper px-3 py-2 text-sm font-medium text-void">
            New platform
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Catalog" value={catalog.length} />
        <Stat label="Live" value={live} />
        <Stat label="Archived" value={catalog.length - live} />
      </div>
      <div className="flex gap-2 text-sm">
        <Filter href="/platforms" on={view === "all"} label="All" />
        <Filter href="/platforms?view=live" on={view === "live"} label="Live" />
        <Filter href="/platforms?view=archived" on={view === "archived"} label="Archived" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs tracking-wide text-fog uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium">Games</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((platform) => (
              <tr key={platform.id} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <Link href={`/platforms/${platform.id}`} className="text-ice">
                    {platform.name}
                  </Link>
                  {platform.archivedAt ? <span className="ml-2 text-xs text-fog">Archived</span> : null}
                </td>
                <td className="px-4 py-3 font-mono">{platform.gameCount}</td>
                <td className="px-4 py-3 text-right">
                  <form action={archivePlatformAction}>
                    <input type="hidden" name="id" value={platform.id} />
                    <input type="hidden" name="archived" value={platform.archivedAt ? "false" : "true"} />
                    <button type="submit" className="text-fog hover:text-white">
                      {platform.archivedAt ? "Restore" : "Archive"}
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

function Filter({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1 ${on ? "bg-white/10 text-white" : "text-fog"}`}>
      {label}
    </Link>
  );
}
