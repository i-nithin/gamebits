"use client";

import { CircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createApiKeyAction, revokeApiKeyAction } from "@/app/actions/api-keys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { ApiKeyListItem } from "@/lib/api/keys";
import { API_KEY_EXPIRY_DEFAULT, API_KEY_EXPIRY_OPTIONS, isApiKeyExpired } from "@/lib/api/token";
import { notifyError, notifySuccess } from "@/lib/notify";
import { cn } from "cn";

const MAX_KEYS = 5;

function formatStamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function maskedKey(key: ApiKeyListItem) {
  return `${key.keyPrefix}…${key.keyLast4}`;
}

function expiryLabel(expiresAt: string | null, expired: boolean) {
  if (!expiresAt) return "No expiry";
  if (expired) return "Expired";
  return `Expires ${formatStamp(expiresAt)}`;
}

export function DeveloperSettings({
  keys,
  origin,
}: {
  keys: ApiKeyListItem[];
  origin: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<string>(API_KEY_EXPIRY_DEFAULT);
  const [secret, setSecret] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [createPending, startCreate] = useTransition();
  const [revokePending, startRevoke] = useTransition();

  const base = origin || "";
  const curl = `curl ${base}/api/v1/weeks/current \\\n  -H "Authorization: Bearer gb_live_..."`;
  const mcp = JSON.stringify(
    {
      mcpServers: {
        gamebits: {
          url: `${base}/api/mcp`,
          headers: { Authorization: "Bearer gb_live_..." },
        },
      },
    },
    null,
    2,
  );
  const revokeTarget = keys.find((key) => key.id === revokeId) ?? null;
  const liveCount = keys.filter((key) => !isApiKeyExpired(key.expiresAt)).length;

  function closeCreate(open: boolean) {
    if (open || createPending) return;
    const created = secret !== null;
    setCreateOpen(false);
    setSecret(null);
    setName("");
    setExpiry(API_KEY_EXPIRY_DEFAULT);
    if (created) router.refresh();
  }

  function submitCreate() {
    startCreate(async () => {
      const result = await createApiKeyAction(name, expiry);
      if (!result.ok) {
        notifyError("Couldn't create that key.", result.error);
        return;
      }
      setSecret(result.token);
    });
  }

  function confirmRevoke() {
    if (!revokeId) return;
    const id = revokeId;
    startRevoke(async () => {
      const result = await revokeApiKeyAction(id);
      if (!result.ok) {
        notifyError("Couldn't revoke that key.", result.error);
        return;
      }
      setRevokeId(null);
      notifySuccess("Key revoked");
      router.refresh();
    });
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      notifySuccess("Copied");
    } catch {
      notifyError("Couldn't copy", "Select the key and copy it manually.");
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-iron bg-obsidian">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full flex-col gap-8 sm:w-[90%] md:w-[70%]">
          <div>
            <h1 className="text-xl font-medium text-paper-white">Developer</h1>
            <p className="mt-1 text-sm text-fog">
              Create a read-only key for the public API and the MCP server. GameBits shows the secret once.
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs tracking-wide text-fog uppercase">API keys</p>
              {liveCount < MAX_KEYS ? (
                <Button
                  type="button"
                  className="rounded-full bg-ice-strong px-5 text-white hover:bg-ice-strong/90"
                  onClick={() => {
                    setSecret(null);
                    setName("");
                    setExpiry(API_KEY_EXPIRY_DEFAULT);
                    setCreateOpen(true);
                  }}
                >
                  Create key
                </Button>
              ) : null}
            </div>
            {liveCount >= MAX_KEYS ? (
              <p className="mb-3 text-sm text-fog">You can have up to 5 active keys. Revoke one to create another.</p>
            ) : null}
            {keys.length === 0 ? (
              <p className="rounded-sm border border-iron bg-page px-4 py-3 text-sm text-fog">No API keys yet.</p>
            ) : (
              <ul className="@container overflow-hidden rounded-sm border border-iron bg-page">
                {keys.map((key) => {
                  const created = formatStamp(key.createdAt);
                  const lastUsed = key.lastUsedAt ? formatStamp(key.lastUsedAt) : null;
                  const expired = isApiKeyExpired(key.expiresAt);
                  const expiryText = expiryLabel(key.expiresAt, expired);
                  return (
                    <li
                      key={key.id}
                      className="flex items-center gap-3 border-b border-iron px-3 py-2 last:border-b-0"
                      title={`Created ${created}. ${lastUsed ? `Last used ${lastUsed}. ` : "Not used yet. "}${expiryText}.`}
                    >
                      <span className="inline-flex shrink-0" title={expired ? "Expired" : "Active"}>
                        <CircleIcon
                          className={cn("size-2", expired ? "fill-destructive text-destructive" : "fill-success text-success")}
                        />
                        <span className="sr-only">{expired ? "Expired" : "Active"}</span>
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-paper-white">{key.name}</span>
                      <span className="shrink-0 font-mono text-xs text-fog">{maskedKey(key)}</span>
                      <span className="hidden shrink-0 text-xs whitespace-nowrap text-fog @min-[36rem]:inline mx-4">
                        {expiryText}
                      </span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="shrink-0 rounded-full border-destructive ml-2"
                        onClick={() => setRevokeId(key.id)}
                      >
                        Revoke
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs tracking-wide text-fog uppercase">Use the API</p>
            <div className="flex flex-col gap-3">
              <pre className="overflow-x-auto rounded-sm border border-iron bg-page p-4 font-mono text-xs text-fog">
                {curl}
              </pre>
              <pre className="overflow-x-auto rounded-sm border border-iron bg-page p-4 font-mono text-xs text-fog">
                {mcp}
              </pre>
              <p className="text-sm text-fog">
                OpenAPI is at {base}/api/v1/openapi.json. Agent notes are at {base}/llms.txt. Requests need the
                Authorization header and are not available to browser pages on other sites.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={closeCreate}>
        <DialogContent className="bg-obsidian text-paper-white ring-iron p-6 rounded-sm" showCloseButton={false}>
          {secret ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-paper-white">Copy your API key</DialogTitle>
                <DialogDescription>
                  Copy this key now. GameBits stores only a hash, so it cannot be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <Input readOnly value={secret} className="font-mono" onFocus={(event) => event.currentTarget.select()} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" className="rounded-full border-iron" onClick={copySecret}>
                    Copy
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      window.setTimeout(() => closeCreate(false), 0);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-paper-white text-lg font-medium">Create an API key</DialogTitle>
                <DialogDescription>Name it after the app or agent that will use it.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="api-key-name">Name</Label>
                  <Input
                    id="api-key-name"
                    value={name}
                    maxLength={40}
                    autoComplete="off"
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <Label htmlFor="api-key-expiry">Expires</Label>
                  <Select
                    value={expiry}
                    onValueChange={(next) => {
                      if (typeof next === "string") setExpiry(next);
                    }}
                  >
                    <SelectTrigger
                      id="api-key-expiry"
                      type="button"
                      className="w-full border-iron bg-charcoal text-paper-white rounded-sm"
                    >
                      <SelectValue>
                        {API_KEY_EXPIRY_OPTIONS.find((option) => option.id === expiry)?.label ?? "30 days"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-iron bg-obsidian">
                      <SelectGroup>
                        {API_KEY_EXPIRY_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-iron"
                    disabled={createPending}
                    onClick={() => closeCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" className="rounded-full bg-ice-strong px-5 text-white hover:bg-ice-strong/90" disabled={createPending} onClick={submitCreate}>
                    {createPending ? <Spinner data-icon="inline-start" /> : null}
                    {createPending ? "Working…" : "Create"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !revokePending) setRevokeId(null);
        }}
      >
        <DialogContent className="bg-obsidian text-paper-white ring-iron rounded-sm p-4" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-paper-white">Revoke this key?</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
              {' '}{revokeTarget ? `${revokeTarget.name} stops working immediately.` : "That key stops working immediately."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-iron"
              disabled={revokePending}
              onClick={() => setRevokeId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full border-destructive"
              disabled={revokePending}
              onClick={confirmRevoke}
            >
              {revokePending ? <Spinner data-icon="inline-start" /> : null}
              {revokePending ? "Working…" : "Revoke"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
