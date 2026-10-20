import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportActions } from "@/components/admin/report-actions";
import { Badge } from "@/components/ui/badge";
import { enforceAdminPage } from "@/lib/auth-admin";
import { getAdminReport } from "@/lib/admin/reports";
import { reportReasonLabel } from "@/lib/reports";

const whenFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const RESOLUTION_LABELS: Record<string, string> = {
  dismissed: "Dismissed",
  comment_removed: "Comment removed",
  game_taken_down: "Game taken down",
  user_banned: "User banned",
};

export default async function AdminReportPage({ params }: { params: Promise<{ id: string }> }) {
  await enforceAdminPage();
  const { id } = await params;
  const report = await getAdminReport(id);
  if (!report) notFound();

  const commentRemoved = Boolean(report.review?.removedAt) && !report.review?.removedByBan;
  const gameDown = Boolean(report.game?.takenDownAt) && !report.game?.hiddenByBan;
  const subjectBanned = Boolean(report.subject?.bannedAt);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <Link href="/4dm1n/reports" className="text-sm text-fog hover:text-paper-white">
          Reports
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-medium tracking-tight">
            {report.targetType === "review" ? "Comment report" : "Game report"}
          </h1>
          <Badge variant="outline" className="capitalize">
            {report.status}
          </Badge>
          {report.warningCount > 1 ? (
            <Badge variant="secondary">{report.warningCount} reports</Badge>
          ) : null}
        </div>
        <p className="text-sm text-fog">{whenFormat.format(new Date(report.createdAt))} UTC</p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-iron bg-obsidian p-4">
        <h2 className="text-sm font-medium">Report</h2>
        <p className="text-sm">{reportReasonLabel(report.reason)}</p>
        {report.details ? <p className="text-sm whitespace-pre-wrap text-fog">{report.details}</p> : null}
        <p className="text-xs text-fog">
          From {report.reporter ? `${report.reporter.name} (@${report.reporter.handle})` : "an unknown account"}
        </p>
        {report.resolution ? (
          <p className="text-xs text-fog">
            {RESOLUTION_LABELS[report.resolution] ?? report.resolution}
            {report.resolvedAt ? ` · ${whenFormat.format(new Date(report.resolvedAt))} UTC` : ""}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-iron bg-obsidian p-4">
        <h2 className="text-sm font-medium">{report.targetType === "review" ? "Comment" : "Game"}</h2>
        {report.review ? (
          <>
            <p className="text-sm text-fog">
              On{" "}
              <Link href={`/games/${report.review.gameSlug}`} className="text-ice-signal hover:underline">
                {report.review.gameName}
              </Link>
              {commentRemoved ? " · removed" : ""}
            </p>
            <p className="text-sm whitespace-pre-wrap">{report.review.body}</p>
          </>
        ) : null}
        {report.game ? (
          <p className="text-sm">
            <Link href={`/games/${report.game.slug}`} className="text-ice-signal hover:underline">
              {report.game.name}
            </Link>
            {gameDown ? <span className="text-fog"> · taken down</span> : null}
          </p>
        ) : null}
        {!report.review && !report.game ? <p className="text-sm text-fog">This target is gone.</p> : null}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-iron bg-obsidian p-4">
        <h2 className="text-sm font-medium">Person</h2>
        {report.subject ? (
          <p className="text-sm">
            <Link href={`/u/${report.subject.handle}`} className="hover:underline">
              {report.subject.name}
            </Link>
            <span className="text-fog"> @{report.subject.handle}</span>
            {subjectBanned ? <Badge variant="outline">Banned</Badge> : null}
            {report.subject.superAdmin ? <Badge variant="secondary">Admin</Badge> : null}
          </p>
        ) : report.review?.displayName ? (
          <p className="text-sm">
            {report.review.displayName}
            <span className="mt-1 block text-fog">No profile on this account, so it can't be banned from here.</span>
          </p>
        ) : (
          <p className="text-sm text-fog">No account is attached to this report.</p>
        )}
        {report.prior.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {report.prior.map((item) => (
              <li key={item.id}>
                <Link href={`/4dm1n/reports/${item.id}`} className="hover:underline">
                  {item.targetType === "review" ? "Comment" : "Game"} · {reportReasonLabel(item.reason)}
                </Link>
                <span className="text-fog">
                  {" "}
                  · {item.status} · {whenFormat.format(new Date(item.createdAt))} UTC
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fog">No other reports for this person.</p>
        )}
      </section>

      <ReportActions
        reportId={report.id}
        subjectId={report.subject?.clerkUserId ?? null}
        canDismiss={report.status === "open"}
        canRemoveComment={report.targetType === "review" && Boolean(report.review) && !commentRemoved}
        canTakeDown={report.targetType === "game" && Boolean(report.game) && !gameDown}
        canBan={Boolean(report.subject) && !subjectBanned && !report.subject?.superAdmin}
        canUnban={subjectBanned}
      />
    </div>
  );
}
