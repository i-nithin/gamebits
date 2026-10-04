import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { AdCard } from "@/components/ads/ad-card";
import { AdPhaseBadge } from "@/components/ads/ad-phase-badge";
import { AdminMonthFilter } from "@/components/ads/admin-month-filter";
import { AdminOrderButtons, RemoveSlotButton } from "@/components/ads/order-actions";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { listAdminAdOrders, listMonthOptions } from "@/lib/ads";
import { currentPacificMonth, monthWindow, parseMonthKey } from "@/lib/ads-month";
import { AD_MONTH_WINDOW } from "@/lib/constants";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function AdminAdbitsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await enforceAdminPage();
  const params = await searchParams;
  const requested = params.month ? parseMonthKey(params.month) : null;
  const fallback = currentPacificMonth();
  const inWindow =
    requested !== null &&
    monthWindow(AD_MONTH_WINDOW).some(
      (month) => month.year === requested.year && month.month === requested.month,
    );
  const month = inWindow && requested ? requested : fallback;
  const [months, orders] = await Promise.all([listMonthOptions(), listAdminAdOrders(month)]);
  const selected =
    months.find((item) => item.year === month.year && item.month === month.month) ?? months[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight">Adbits</h1>
          <p className="max-w-xl text-sm text-fog">
            Sidebar ads go live and end at midnight Pacific Time. The window below follows daylight
            saving, so the label reads PDT or PST for that instant.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/4dm1n/adbits/new" />}>
          <PlusIcon data-icon="inline-start" />
          Place an ad
        </Button>
      </div>

      <section className="flex flex-col gap-1 rounded-2xl border border-iron bg-obsidian px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-paper-white">
              {selected ? selected.label : "Bookings"}
            </h2>
            {selected ? (
              <p className="mt-1 text-sm text-fog">
                {selected.windowLabel} · {selected.booked}/{selected.cap} slots held
              </p>
            ) : null}
          </div>
          {selected ? <AdminMonthFilter months={months} value={selected.key} /> : null}
        </div>

        {orders.length === 0 ? (
          <Empty className="border border-dashed border-iron">
            <EmptyHeader>
              <EmptyTitle>No bookings this month</EmptyTitle>
              <EmptyDescription>Approved ads for this month show on the home rail.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col">
            {orders.map((order) => {
              const openSlots = order.slots.filter(
                (slot) => slot.status === "pending" || slot.status === "approved",
              );
              return (
                <li key={order.id} className="flex flex-col gap-3 border-t border-iron py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="w-full sm:w-56">
                      <AdCard ad={order} compact />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-paper-white">
                        {order.ownerName}
                        <span className="font-normal text-fog">@{order.ownerHandle}</span>
                        <AdPhaseBadge phase={order.phase} />
                      </p>
                      <p className="mt-1 text-xs text-fog">
                        {order.activeSlots} active of {order.slotCount} · Booked {order.bookedAt} ·{" "}
                        {order.clickCount} {order.clickCount === 1 ? "click" : "clicks"}
                      </p>
                      <p className="truncate text-xs text-fog">{order.destinationUrl}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {order.phase === "pending" ||
                      order.phase === "scheduled" ||
                      order.phase === "live" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/4dm1n/adbits/${order.id}/edit`} />}
                        >
                          Edit
                        </Button>
                      ) : null}
                      <AdminOrderButtons
                        orderId={order.id}
                        pendingReview={order.status === "pending"}
                        canRemove={openSlots.length > 0}
                      />
                    </div>
                  </div>
                  <details className="text-xs text-fog">
                    <summary className="cursor-pointer">Slot records</summary>
                    <ul className="mt-2 flex flex-col gap-1">
                      {order.slots.map((slot, index) => (
                        <li key={slot.id} className="flex items-center justify-between gap-3">
                          <span>
                            Slot {index + 1} · {slot.status}
                          </span>
                          {slot.status === "pending" || slot.status === "approved" ? (
                            <RemoveSlotButton slotId={slot.id} label="Remove slot" />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
