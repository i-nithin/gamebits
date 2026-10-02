import { setSuperAdminAction } from "@/app/actions/admin";
import { AdminListShell, DirectoryPager } from "@/components/admin/directory-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAdminUsers, parseAdminListParams } from "@/lib/admin/directory";
import { enforceAdminPage } from "@/lib/auth-admin";

const joinedFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  await enforceAdminPage();
  const params = parseAdminListParams(await searchParams);
  const result = await listAdminUsers(params);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">Users</h1>
        <p className="max-w-xl text-sm text-fog">
          Everyone who has opened GameBits. Admins can grant or revoke admin access.
        </p>
      </div>
      <AdminListShell
        query={params.query}
        pageSize={result.pageSize}
        placeholder="Search name, handle, or email"
      >
        {result.items.length === 0 ? (
          <Empty className="border border-dashed border-iron">
            <EmptyHeader>
              <EmptyTitle>{params.query ? "No matching users" : "No users yet"}</EmptyTitle>
              <EmptyDescription>
                {params.query
                  ? "Try another name, handle, or email."
                  : "Profiles appear after someone signs in."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Handle</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>
                    <span className="sr-only">Access</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((user) => {
                  const lastAdmin = user.superAdmin && result.superAdminCount <= 1;
                  return (
                    <TableRow key={user.clerkUserId}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell className="stat-mono">{user.handle}</TableCell>
                      <TableCell>{user.email ?? "—"}</TableCell>
                      <TableCell>{joinedFormat.format(new Date(user.joinedAt))}</TableCell>
                      <TableCell>
                        {user.superAdmin ? <Badge variant="secondary">Admin</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {lastAdmin ? null : (
                          <form action={setSuperAdminAction}>
                            <input type="hidden" name="clerkUserId" value={user.clerkUserId} />
                            <input
                              type="hidden"
                              name="superAdmin"
                              value={user.superAdmin ? "false" : "true"}
                            />
                            <Button type="submit" variant="ghost" size="sm">
                              {user.superAdmin ? "Revoke admin" : "Make admin"}
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <DirectoryPager
          pathname="/4dm1n"
          query={params.query}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
        />
      </AdminListShell>
    </div>
  );
}
