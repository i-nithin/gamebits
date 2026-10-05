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

function useOrderAction(action: (id: string) => Promise<{ ok: boolean; error?: string }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        setError(result.error ?? "Could not update that booking");
        return;
      }
      router.refresh();
    });
  }

  return { pending, error, run };
}

export function ContinueCheckoutButton({ orderId }: { orderId: string }) {
  const { pending, error, run } = useOrderAction(continueAdCheckoutAction);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        className="h-9 rounded-full px-5"
        disabled={pending}
        onClick={() => run(orderId)}
      >
        {pending ? "Opening checkout" : "Pay"}
      </Button>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const { pending, error, run } = useOrderAction(cancelAdOrderAction);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-9 rounded-full border-iron px-5"
        disabled={pending}
        onClick={() => run(orderId)}
      >
        Cancel
      </Button>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

export function RemoveSlotButton({ slotId, label }: { slotId: string; label: string }) {
  const { pending, error, run } = useOrderAction(removeAdSlotAction);
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(slotId)}>
        {label}
      </Button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </div>
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
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ ok: boolean; error?: string }>, id: string) {
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        setError(result.error ?? "Could not update that booking");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-1.5">
        {pendingReview ? (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={() => run(approveAdOrderAction, orderId)}>
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(rejectAdOrderAction, orderId)}
            >
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
            onClick={() => run(removeAdOrderAction, orderId)}
          >
            Remove order
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
