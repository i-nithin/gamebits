import Link from "next/link";

import { AdCard } from "@/components/ads/ad-card";
import { AdPaymentLine } from "@/components/ads/ad-payment-line";
import { AdPhaseBadge } from "@/components/ads/ad-phase-badge";
import { CancelOrderButton, ContinueCheckoutButton } from "@/components/ads/order-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdOrderRecord } from "@/lib/ads-types";
import { CAROUSEL_BADGE_LABELS } from "@/lib/constants";

function editHref(order: AdOrderRecord) {
  return order.placement === "carousel" ? `/adbits/carousel/${order.id}` : `/adbits/sidebar/${order.id}`;
}

function againHref(order: AdOrderRecord) {
  return order.placement === "carousel"
    ? `/adbits/carousel?again=${order.id}`
    : `/adbits/sidebar?again=${order.id}`;
}

export function AdHistory({
  orders,
  checkoutReturn,
}: {
  orders: AdOrderRecord[];
  checkoutReturn: boolean;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-iron bg-obsidian">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full sm:w-[90%] md:w-[70%]">
          <h1 className="text-xl font-medium text-paper-white">Your ad history</h1>
          <p className="mt-1 text-sm text-fog">
            Every booking is its own record, including ones you place again.
          </p>
          {checkoutReturn ? (
            <p className="mt-4 rounded-sm border border-iron bg-page px-4 py-3 text-sm text-fog">
              If the payment went through, this page updates once we confirm it. A paid booking goes
              live for the weeks you chose.
            </p>
          ) : null}
          {orders.length === 0 ? (
            <p className="mt-6 rounded-sm border border-iron bg-page px-4 py-4 text-sm text-fog">
              Nothing booked yet. Book weeks from{" "}
              <Link href="/adbits/sidebar" className="text-ice-signal hover:underline">
                Right sidebar
              </Link>{" "}
              or{" "}
              <Link href="/adbits/carousel" className="text-ice-signal hover:underline">
                Hero carousel
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-6 overflow-hidden rounded-sm border border-iron bg-page">
              {orders.map((order) => {
                const place = order.placement === "carousel" ? "Hero carousel" : "Right sidebar";
                return (
                  <li key={order.id} className="flex flex-col gap-3 border-b border-iron px-4 py-4 last:border-b-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="w-full sm:w-56">
                        <AdCard ad={order} compact />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm text-paper-white">
                          {place}
                          {order.placement === "carousel" && order.gameName ? ` · ${order.gameName}` : null}
                          {` · ${order.scheduleLabel}`}
                          {order.badge ? (
                            <Badge variant="outline">{CAROUSEL_BADGE_LABELS[order.badge]}</Badge>
                          ) : null}
                          <AdPhaseBadge phase={order.phase} />
                        </p>
                        <p className="mt-1 text-xs text-fog">
                          Booked {order.bookedAt} · {order.clickCount}{" "}
                          {order.clickCount === 1 ? "click" : "clicks"}
                        </p>
                        {order.paymentStatus === "waived" ? null : (
                          <AdPaymentLine
                            status={order.paymentStatus}
                            amountCents={order.amountCents}
                            currency={order.currency}
                            paymentId={null}
                          />
                        )}
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
                            render={<Link href={editHref(order)} />}
                          >
                            Edit
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          className="h-9 rounded-full border-iron px-5"
                          nativeButton={false}
                          render={<Link href={againHref(order)} />}
                        >
                          Place again
                        </Button>
                        {order.paymentStatus === "checkout" ? (
                          <ContinueCheckoutButton orderId={order.id} />
                        ) : null}
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
        </div>
      </div>
    </section>
  );
}
