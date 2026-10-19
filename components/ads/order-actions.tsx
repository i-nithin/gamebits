"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  approveAdOrderAction,
  cancelAdOrderAction,
  continueAdCheckoutAction,
  rejectAdOrderAction,
  removeAdOrderAction,
  removeAdSlotAction,
} from "@/app/actions/ads";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { notifyError, notifySuccess } from "@/lib/notify";

function useOrderAction(
  action: (id: string) => Promise<{ ok: boolean; error?: string }>,
  success: string,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(id: string) {
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        notifyError("Couldn't update that booking.", result.error ?? "Try again in a moment.");
        return;
      }
      notifySuccess(success);
      router.refresh();
    });
  }

  return { pending, run };
}

export function ContinueCheckoutButton({ orderId }: { orderId: string }) {
  const { pending, run } = useOrderAction(continueAdCheckoutAction, "Opening checkout.");
  return (
    <Button
      type="button"
      className="h-9 rounded-full px-5"
      disabled={pending}
      onClick={() => run(orderId)}
    >
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {pending ? "Opening checkout…" : "Pay"}
    </Button>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const { pending, run } = useOrderAction(cancelAdOrderAction, "Booking cancelled.");
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-full border-iron px-5"
      disabled={pending}
      onClick={() => run(orderId)}
    >
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {pending ? "Cancelling…" : "Cancel"}
    </Button>
  );
}

export function RemoveSlotButton({ slotId, label }: { slotId: string; label: string }) {
  const { pending, run } = useOrderAction(removeAdSlotAction, "Slot removed.");
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(slotId)}>
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}

export function AdminOrderButtons({
  orderId,
  pendingReview,
  canRemove,
}: {
  orderId: string;
  pendingReview: boolean;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  function run(
    action: (id: string) => Promise<{ ok: boolean; error?: string }>,
    id: string,
    success: string,
    key: string,
  ) {
    setPendingKey(key);
    startTransition(async () => {
      const result = await action(id);
      setPendingKey(null);
      if (!result.ok) {
        notifyError("Couldn't update that booking.", result.error ?? "Try again in a moment.");
        return;
      }
      notifySuccess(success);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-1.5">
        {pendingReview ? (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={() => run(approveAdOrderAction, orderId, "Booking approved.", "approve")}>
              {pendingKey === "approve" ? <Spinner data-icon="inline-start" /> : null}
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(rejectAdOrderAction, orderId, "Booking rejected.", "reject")}
            >
              {pendingKey === "reject" ? <Spinner data-icon="inline-start" /> : null}
              Reject
            </Button>
          </>
        ) : null}
        {canRemove ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(removeAdOrderAction, orderId, "Booking removed.", "remove")}
          >
            {pendingKey === "remove" ? <Spinner data-icon="inline-start" /> : null}
            Remove order
          </Button>
        ) : null}
      </div>
    </div>
  );
}
