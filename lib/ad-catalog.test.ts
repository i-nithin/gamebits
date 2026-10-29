import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adPaymentMatches, SIDEBAR_AD_UNIT_CENTS } from "./ad-catalog";

const productId = "pdt_sidebar";

describe("adPaymentMatches", () => {
  it("accepts the catalog price for the booked quantity", () => {
    assert.equal(
      adPaymentMatches({
        productId,
        expectedQuantity: 2,
        cart: [{ product_id: productId, quantity: 2 }],
        amountCents: SIDEBAR_AD_UNIT_CENTS * 2,
        currency: "usd",
        placement: "sidebar",
      }),
      true,
    );
  });

  it("rejects a charge below the catalog price", () => {
    assert.equal(
      adPaymentMatches({
        productId,
        expectedQuantity: 2,
        cart: [{ product_id: productId, quantity: 2 }],
        amountCents: SIDEBAR_AD_UNIT_CENTS,
        currency: "USD",
        placement: "sidebar",
      }),
      false,
    );
  });

  it("rejects a cart that includes another product", () => {
    assert.equal(
      adPaymentMatches({
        productId,
        expectedQuantity: 1,
        cart: [
          { product_id: productId, quantity: 1 },
          { product_id: "pdt_other", quantity: 1 },
        ],
        amountCents: SIDEBAR_AD_UNIT_CENTS,
        currency: "USD",
        placement: "sidebar",
      }),
      false,
    );
  });
});
