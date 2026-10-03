export const ACCOUNT_DELETION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export function deletionDeadline(deletedAt: Date) {
  return new Date(deletedAt.getTime() + ACCOUNT_DELETION_GRACE_MS);
}

export function deletionGraceEnded(deletedAt: Date, now = new Date()) {
  return now.getTime() >= deletionDeadline(deletedAt).getTime();
}

export function formatDeletionDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
