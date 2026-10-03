"use client";

import { useClerk } from "@clerk/nextjs";
import { MonitorIcon, SmartphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteAccountAction,
  restoreAccountAction,
  revokeSessionAction,
  updateDisplayNameAction,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDeletionDate } from "@/lib/account-deletion";
import { clearGameDraft } from "@/lib/game-draft";
import { formatRelativeTime } from "@/lib/notifications/format";
import type { AccountSession, ClerkAccount } from "@/lib/settings/account";

function sessionTitle(session: AccountSession) {
  if (session.browser && session.device) return `${session.browser} on ${session.device}`;
  return session.browser || session.device || "Unknown device";
}

function sessionMeta(session: AccountSession) {
  const active =
    session.lastActiveAt > 0
      ? formatRelativeTime(new Date(session.lastActiveAt).toISOString())
      : null;
  return [session.place, active].filter(Boolean).join(" · ");
}

export function AccountSettings({
  name,
  handle,
  deletionDeadline = null,
  account,
  accountError,
}: {
  name: string;
  handle: string;
  deletionDeadline?: string | null;
  account: ClerkAccount | null;
  accountError: string | null;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(name);
  const [savedName, setSavedName] = useState(name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);
  const [sessions, setSessions] = useState(account?.sessions ?? []);
  const [pending, setPending] = useState<AccountSession | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokePending, setRevokePending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restorePending, setRestorePending] = useState(false);

  const confirmationMatches = confirmation.trim().toLowerCase() === handle.toLowerCase();
  const scheduled = Boolean(deletionDeadline);

  const trimmed = displayName.trim();
  const nameDirty = trimmed !== savedName;

  async function saveName() {
    setNamePending(true);
    setNameError(null);
    const result = await updateDisplayNameAction(displayName);
    setNamePending(false);
    if (!result.ok) {
      setNameError(result.error);
      return;
    }
    setDisplayName(result.name);
    setSavedName(result.name);
  }

  async function confirmRevoke() {
    if (!pending) return;
    setRevokePending(true);
    setRevokeError(null);
    const result = await revokeSessionAction(pending.id);
    if (!result.ok) {
      setRevokePending(false);
      setRevokeError(result.error);
      return;
    }
    if (result.current) {
      await signOut({ redirectUrl: "/" });
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== pending.id));
    setPending(null);
    setRevokePending(false);
  }

  async function confirmDelete() {
    if (!confirmationMatches || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    const result = await deleteAccountAction(confirmation);
    if (!result.ok) {
      if (result.expired) {
        clearGameDraft();
        await signOut({ redirectUrl: "/" });
        return;
      }
      setDeletePending(false);
      setDeleteError(result.error);
      return;
    }
    clearGameDraft();
    await signOut({ redirectUrl: "/" });
  }

  async function restoreAccount() {
    if (restorePending) return;
    setRestorePending(true);
    setRestoreError(null);
    const result = await restoreAccountAction();
    if (!result.ok) {
      if (result.expired) {
        await signOut({ redirectUrl: "/" });
        return;
      }
      setRestorePending(false);
      setRestoreError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
    {scheduled ? null : (
    <section className="flex flex-col gap-6 rounded-2xl border border-iron bg-obsidian px-4 py-4 sm:px-5">
      <div>
        <h2 className="text-lg font-medium text-paper-white">Account</h2>
        {accountError ? <p className="mt-1 text-sm text-error">{accountError}</p> : null}
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!nameDirty || namePending) return;
          void saveName();
        }}
      >
        <label className="flex flex-col gap-1.5" htmlFor="display-name">
          <span className="text-sm text-paper-white">Name</span>
          <Input
            id="display-name"
            value={displayName}
            maxLength={80}
            autoComplete="name"
            className="h-9 rounded-lg border-iron bg-graphite"
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={!nameDirty || !trimmed || namePending}
            className="h-9 rounded-full px-5"
          >
            {namePending ? "Saving" : "Save"}
          </Button>
          {nameError ? <p className="text-sm text-error">{nameError}</p> : null}
        </div>
      </form>

      <div className="border-t border-iron pt-5">
        <h3 className="text-sm font-medium text-paper-white">Login</h3>
        {account ? (
          <dl className="mt-3 flex flex-col gap-4 text-sm">
            <div>
              <dt className="text-fog">Email</dt>
              <dd className="mt-1 flex flex-col gap-1 text-paper-white">
                {account.emails.length > 0 ? (
                  account.emails.map((item) => (
                    <span key={item.email}>
                      {item.email}
                      {item.primary && account.emails.length > 1 ? (
                        <span className="text-fog"> · Primary</span>
                      ) : null}
                    </span>
                  ))
                ) : (
                  <span className="text-fog">No email on this account</span>
                )}
              </dd>
            </div>
            {account.username ? (
              <div>
                <dt className="text-fog">Username</dt>
                <dd className="mt-1 text-paper-white">{account.username}</dd>
              </div>
            ) : null}
            {account.passwordEnabled || account.providers.length > 0 ? (
              <div>
                <dt className="text-fog">Sign-in methods</dt>
                <dd className="mt-1 flex flex-col gap-1 text-paper-white">
                  {account.passwordEnabled ? <span>Email and password</span> : null}
                  {account.providers.map((provider) => (
                    <span key={provider.id}>
                      {provider.label}
                      {provider.detail ? <span className="text-fog"> · {provider.detail}</span> : null}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <div className="border-t border-iron pt-5">
        <h3 className="text-sm font-medium text-paper-white">Sessions</h3>
        <p className="mt-1 text-sm text-fog">Sign out of GameBits on a device.</p>
        {account ? (
          <ul className="mt-2">
            {sessions.length === 0 ? (
              <li className="py-3 text-sm text-fog">No active sessions.</li>
            ) : (
              sessions.map((session) => {
                const Icon = session.mobile ? SmartphoneIcon : MonitorIcon;
                const meta = sessionMeta(session);
                return (
                  <li
                    key={session.id}
                    className="flex items-center gap-3 border-t border-iron py-3"
                  >
                    <Icon className="size-4 shrink-0 text-fog" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm text-paper-white">
                          {sessionTitle(session)}
                        </span>
                        {session.current ? (
                          <span className="rounded-full bg-slate px-2 py-0.5 text-xs text-ice-signal">
                            This device
                          </span>
                        ) : null}
                      </span>
                      {meta ? <span className="block truncate text-xs text-fog">{meta}</span> : null}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-iron"
                      onClick={() => {
                        setRevokeError(null);
                        setPending(session);
                      }}
                    >
                      {session.current ? "Sign out" : "Revoke"}
                    </Button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}
      </div>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !revokePending) {
            setPending(null);
            setRevokeError(null);
          }
        }}
      >
        <DialogContent className="bg-obsidian text-paper-white ring-iron" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-paper-white">
              {pending?.current ? "Sign out of this device?" : "Revoke this session?"}
            </DialogTitle>
            <DialogDescription>
              {pending?.current
                ? "You will need to sign in again on this device."
                : "That device will be signed out of GameBits."}
            </DialogDescription>
          </DialogHeader>
          {revokeError ? <p className="text-sm text-error">{revokeError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-iron"
              disabled={revokePending}
              onClick={() => {
                setPending(null);
                setRevokeError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={revokePending}
              onClick={() => {
                void confirmRevoke();
              }}
            >
              {revokePending ? "Working" : pending?.current ? "Sign out" : "Revoke"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
    )}

    {scheduled && deletionDeadline ? (
      <section className="flex flex-col gap-3 rounded-2xl border border-error/40 bg-obsidian px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-lg font-medium text-error">Account scheduled for deletion</h2>
          <p className="mt-1 text-sm text-fog">
            Your profile is hidden. You can restore this account until{" "}
            {formatDeletionDate(deletionDeadline)}. After that, this login is removed. Reviews stay
            as Deleted user. Votes and likes stay. Published games stay up.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="rounded-full"
            disabled={restorePending}
            onClick={() => {
              void restoreAccount();
            }}
          >
            {restorePending ? "Restoring" : "Restore account"}
          </Button>
          {restoreError ? <p className="text-sm text-error">{restoreError}</p> : null}
        </div>
      </section>
    ) : (
    <section className="flex flex-col gap-3 rounded-2xl border border-error/40 bg-obsidian px-4 py-4 sm:px-5">
      <div>
        <h2 className="text-lg font-medium text-error">Danger Zone</h2>
        <p className="mt-1 text-sm text-fog">
          Closing your account hides your profile and signs you out. Reviews you wrote stay on
          games as Deleted user. Votes and likes stay. Games you published stay public, including
          launch weeks, and you will not be able to edit them until you restore. You can sign back
          in and restore this account for 30 days. After that, this login is removed.
        </p>
      </div>
      <div>
        <Button
          type="button"
          variant="destructive"
          className="rounded-full"
          onClick={() => {
            setDeleteError(null);
            setConfirmation("");
            setDeleteOpen(true);
          }}
        >
          Delete account
        </Button>
      </div>
    </section>
    )}

    <Dialog
      open={deleteOpen}
      onOpenChange={(open) => {
        if (!open && !deletePending) {
          setDeleteOpen(false);
          setDeleteError(null);
          setConfirmation("");
        }
      }}
    >
      <DialogContent className="bg-obsidian text-paper-white ring-iron" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-paper-white">Delete your account?</DialogTitle>
          <DialogDescription>
            Your profile disappears now. Reviews stay as Deleted user, votes stay, and published
            games stay up. You can sign back in and restore this account for 30 days. After that,
            this login is removed.
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5" htmlFor="delete-handle">
          <span className="text-sm text-paper-white">Type @{handle} to confirm</span>
          <Input
            id="delete-handle"
            value={confirmation}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-9 rounded-lg border-iron bg-graphite"
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        {deleteError ? <p className="text-sm text-error">{deleteError}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-iron"
            disabled={deletePending}
            onClick={() => {
              setDeleteOpen(false);
              setDeleteError(null);
              setConfirmation("");
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={!confirmationMatches || deletePending}
            onClick={() => {
              void confirmDelete();
            }}
          >
            {deletePending ? "Deleting" : "Delete account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
