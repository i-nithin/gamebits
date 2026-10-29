import Link from "next/link";

import { AdminListShell, DirectoryPager } from "@/components/admin/directory-bar";
import { Badge } from "@/components/ui/badge";
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
import { listAdminReports, parseReportStatus } from "@/lib/admin/reports";
import { parseAdminListParams } from "@/lib/admin/params";
import { enforceAdminPage } from "@/lib/auth-admin";
import { reportReasonLabel } from "@/lib/reports";

const whenFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; status?: string }>;
}) {
  await enforceAdminPage();
  const raw = await searchParams;
  const params = parseAdminListParams(raw);
  const status = parseReportStatus(raw.status);
  const result = await listAdminReports({ ...params, status });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">Reports</h1>
        <p className="max-w-xl text-sm text-fog">
          Comments and games people flagged. The count is how many reports on that person were not dismissed.
        </p>
      </div>
      <AdminListShell
        query={params.query}
        pageSize={result.pageSize}
        placeholder="Search people, games, or comments"
        status={status}
      >
        {result.items.length === 0 ? (
          <Empty className="border border-dashed border-iron">
            <EmptyHeader>
              <EmptyTitle>{params.query ? "No matching reports" : "No reports"}</EmptyTitle>
              <EmptyDescription>
                {params.query ? "Try another name, game, or comment." : "New reports show up here."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link href={`/4dm1n/reports/${report.id}`} className="font-medium hover:underline">
                        {report.targetType === "review" ? "Comment" : "Game"}
                      </Link>
                      <span className="mt-1 block max-w-sm truncate text-xs text-fog">
                        {report.gameName ? `${report.gameName} · ` : ""}
                        {report.targetLabel}
                      </span>
                    </TableCell>
                    <TableCell>{reportReasonLabel(report.reason)}</TableCell>
                    <TableCell>
                      {report.subjectHandle ? (
                        <span>
                          {report.subjectName}
                          <span className="mt-1 block text-xs text-fog">@{report.subjectHandle}</span>
                        </span>
                      ) : report.authorName ? (
                        <span>
                          {report.authorName}
                          <span className="mt-1 block text-xs text-fog">No profile</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {report.warningCount > 0 ? (
                        <Badge variant={report.warningCount > 1 ? "secondary" : "outline"}>
                          {report.warningCount}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{report.status}</TableCell>
                    <TableCell>{whenFormat.format(new Date(report.createdAt))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DirectoryPager
          pathname="/4dm1n/reports"
          query={params.query}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          status={status}
        />
      </AdminListShell>
    </div>
  );
}

export const metadata = { title: 'Review Reports', robots: { index: false, follow: false } };
