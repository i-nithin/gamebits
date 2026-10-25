import { toast } from "sonner";

export function notifySuccess(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}

export function notifyError(title: string, description?: string) {
  toast.error(title, description ? { description } : undefined);
}

export function notifyReason(title: string, reason: string) {
  if (reason === "unauthenticated") {
    notifyError(title, "Sign in to continue.");
    return;
  }
  if (reason === "banned") {
    notifyError(title, "This account is banned.");
    return;
  }
  if (reason === "closed") {
    notifyError(title, "This account is closed.");
    return;
  }
  if (reason === "frozen") {
    notifyError(title, "Voting opens when this week starts.");
    return;
  }
  notifyError(title, "Try again in a moment.");
}
