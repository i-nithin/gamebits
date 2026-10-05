export const SIDEBAR_AD_PRODUCT_ID = "pdt_0Np5CYIKmY2LCB70LyhbU";
export const CAROUSEL_AD_PRODUCT_ID = "pdt_0Np5D4u3kNKrTURrYDSZk";
export const SIDEBAR_AD_UNIT_CENTS = 9900;
export const CAROUSEL_AD_UNIT_CENTS = 29900;

export const AD_PAYMENT_LABELS = {
  checkout: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
  waived: "Waived",
} as const;

export type AdPaymentStatus = keyof typeof AD_PAYMENT_LABELS;

export function adProductId(placement: "sidebar" | "carousel") {
  return placement === "carousel" ? CAROUSEL_AD_PRODUCT_ID : SIDEBAR_AD_PRODUCT_ID;
}

export function adUnitCents(placement: "sidebar" | "carousel") {
  return placement === "carousel" ? CAROUSEL_AD_UNIT_CENTS : SIDEBAR_AD_UNIT_CENTS;
}

export function formatUsd(cents: number) {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function formatCharge(cents: number, currency: string | null) {
  if (currency && currency !== "USD") return `${cents} ${currency}`;
  return formatUsd(cents);
}
