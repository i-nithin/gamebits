import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

import { AdCard } from "@/components/ads/ad-card";
import { AdPhaseBadge } from "@/components/ads/ad-phase-badge";
import { CancelOrderButton } from "@/components/ads/order-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { listMonthOptions, listUserAdOrders } from "@/lib/ads";
import { getCurrentUserId, isAccountClosed } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import type { AdOrderRecord, MonthOption } from "@/lib/ads-types";

export default async function AdbitsPage() {
  const userId = await getCurrentUserId();
  const closed = userId ? await isAccountClosed(userId) : false;

  if (!userId || closed) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <AdbitsHeader />
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyTitle>
              {closed ? "This account is closed" : "Sign in to book an ad"}
            </EmptyTitle>
            <EmptyDescription>
              {closed
                ? "Restore the account in settings before booking an ad."
                : "Bookings stay on your account, including ones you place again."}
            </EmptyDescription>
          </EmptyHeader>
          {!closed && clerkEnabled ? (
            <SignInButton mode="modal">
              <Button variant="outline" className="rounded-full">
                Sign in
              </Button>
            </SignInButton>
          ) : null}
        </Empty>
      </div>
    );
  }

  const [months, orders] = await Promise.all([listMonthOptions(), listUserAdOrders(userId)]);
  const current = months[0];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <AdbitsHeader
        action={
          <Button
            className="h-9 rounded-full px-5"
            nativeButton={false}
            render={<Link href="/adbits/new" />}
          >
            Book a slot
          </Button>
        }
      />
      <AvailabilityPanel months={months} windowLabel={current?.windowLabel} />
      <YourAdsPanel orders={orders} />
    </div>
  );
}

function AdbitsHeader({ action }: { action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-fog uppercase">Advertise</p>
        <h1 className="text-2xl font-medium text-paper-white sm:text-[32px]">Adbits</h1>
        <p className="max-w-xl text-sm text-fog">
          A card in the right rail of the board. Six slots run each month.
        </p>
      </div>
      {action}
    </div>
  );
}

function AvailabilityPanel({
  months,
  windowLabel,
}: {
  months: MonthOption[];
  windowLabel?: string;
}) {
  return (
    <section className="flex flex-col gap-1 rounded-2xl border border-iron bg-obsidian px-4 py-4 sm:px-5">
      <div className="pb-2">
        <h2 className="text-lg font-medium text-paper-white">Availability</h2>
        <p className="mt-1 text-sm text-fog">
          {windowLabel
            ? `A month starts and ends at midnight Pacific. ${windowLabel}.`
            : "A month starts and ends at midnight Pacific Time."}
        </p>
      </div>
      <ul className="flex flex-col">
        {months.map((month) => (
          <li
            key={month.key}
            className="flex items-center justify-between gap-3 border-t border-iron py-3"
          >
            <span className="text-sm text-paper-white">{month.label}</span>
            <span className="flex items-center gap-3">
              <span className="stat-mono text-xs text-fog">
                {month.booked}/{month.cap}
              </span>
              <Badge variant={month.full ? "outline" : "secondary"}>
                {month.full ? "Full" : `${month.cap - month.booked} open`}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function YourAdsPanel({ orders }: { orders: AdOrderRecord[] }) {
  return (
    <section className="flex flex-col gap-1 rounded-2xl border border-iron bg-obsidian px-4 py-4 sm:px-5">
      <div className="pb-2">
        <h2 className="text-lg font-medium text-paper-white">Your ads</h2>
        <p className="mt-1 text-sm text-fog">
          Every booking is its own record, including ones you place again.
        </p>
      </div>
      {orders.length === 0 ? (
        <p className="border-t border-iron py-3 text-sm text-fog">
          Nothing booked yet. Book a slot to put a card in the rail.
        </p>
      ) : (
        <ul className="flex flex-col">
          {orders.map((order) => {
            const slots = order.activeSlots || order.slotCount;
            return (
              <li key={order.id} className="flex flex-col gap-3 border-t border-iron py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-full sm:w-56">
                    <AdCard ad={order} compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-paper-white">
                      {order.monthLabel} · {slots} {slots === 1 ? "slot" : "slots"}
                      <AdPhaseBadge phase={order.phase} />
                    </p>
                    <p className="mt-1 text-xs text-fog">
                      Booked {order.bookedAt} · {order.clickCount}{" "}
                      {order.clickCount === 1 ? "click" : "clicks"}
                    </p>
                    <p className="truncate text-xs text-fog">{order.destinationUrl}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.phase === "pending" ||
                    order.phase === "scheduled" ||
                    order.phase === "live" ? (
                      <Button
                        variant="outline"
                        className="h-9 rounded-full border-iron px-5"
                        nativeButton={false}
                        render={<Link href={`/adbits/${order.id}/edit`} />}
                      >
                        Edit
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className="h-9 rounded-full border-iron px-5"
                      nativeButton={false}
                      render={<Link href={`/adbits/new?again=${order.id}`} />}
                    >
                      Place again
                    </Button>
                    {order.phase === "pending" ? <CancelOrderButton orderId={order.id} /> : null}
                  </div>
                </div>
                <details className="text-xs text-fog">
                  <summary className="cursor-pointer">Slot records</summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {order.slots.map((slot, index) => (
                      <li key={slot.id}>
                        Slot {index + 1} · {slot.status}
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
  );
}
