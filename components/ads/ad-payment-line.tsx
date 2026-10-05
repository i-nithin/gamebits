import { AD_PAYMENT_LABELS, formatCharge, type AdPaymentStatus } from "@/lib/ad-catalog";

export function AdPaymentLine({
  status,
  amountCents,
  currency,
  paymentId,
}: {
  status: AdPaymentStatus;
  amountCents: number | null;
  currency: string | null;
  paymentId: string | null;
}) {
  const amount =
    status === "paid" && amountCents != null ? formatCharge(amountCents, currency) : null;
  const label = amount ? `${AD_PAYMENT_LABELS[status]} ${amount}` : AD_PAYMENT_LABELS[status];

  return (
    <p className="mt-1 text-xs text-fog">
      {label}
      {paymentId ? <span className="ml-1 font-mono">{paymentId}</span> : null}
    </p>
  );
}
