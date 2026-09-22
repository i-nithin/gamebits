import Link from "next/link";
import { redirect } from "next/navigation";

import { setPlatformArchivedAction } from "@/app/actions/platforms";
import { PlatformForm } from "@/components/admin/platform-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { listAllPlatforms } from "@/lib/queries";

export default async function AdminPlatformsPage() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) {
    redirect("/");
  }

  const catalog = await listAllPlatforms();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs tracking-wide text-fog uppercase">
            <Link href="/admin" className="hover:text-paper-white">
              Admin
            </Link>
            <span className="px-1.5">/</span>
            Platforms
          </p>
          <h1 className="text-xl font-medium">Platforms</h1>
          <p className="text-sm text-fog">
            Curate the list owners pick from when adding a game. Archive instead of deleting.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Order</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.map((platform) => (
              <TableRow key={platform.id}>
                <TableCell>
                  <Link href={`/admin/platforms/${platform.id}`} className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={platform.logoUrl}
                      alt=""
                      className="size-6 rounded-md object-contain"
                    />
                    <span className="text-ice-signal">{platform.name}</span>
                    {platform.archivedAt ? (
                      <span className="text-xs text-fog">Archived</span>
                    ) : null}
                  </Link>
                </TableCell>
                <TableCell className="stat-mono text-fog">{platform.slug}</TableCell>
                <TableCell className="stat-mono">{platform.sortOrder}</TableCell>
                <TableCell>
                  <form action={setPlatformArchivedAction}>
                    <input type="hidden" name="id" value={platform.id} />
                    <input
                      type="hidden"
                      name="archived"
                      value={platform.archivedAt ? "false" : "true"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {platform.archivedAt ? "Unarchive" : "Archive"}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Add platform</h2>
        <PlatformForm />
      </div>
    </div>
  );
}
