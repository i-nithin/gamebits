import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientIp } from "./rate-limit";

function headers(values: Record<string, string>) {
  return new Headers(values);
}

describe("clientIp", () => {
  it("uses the last Vercel hop when the client prefixes X-Forwarded-For", () => {
    const ip = clientIp(
      headers({
        "x-vercel-forwarded-for": "1.2.3.4, 203.0.113.8",
        "x-forwarded-for": "1.2.3.4, 203.0.113.8",
        "x-real-ip": "1.2.3.4",
      }),
    );
    assert.equal(ip, "203.0.113.8");
  });

  it("uses x-real-ip before a spoofed first forwarded hop", () => {
    const ip = clientIp(
      headers({
        "x-forwarded-for": "1.2.3.4, 203.0.113.8",
        "x-real-ip": "203.0.113.8",
      }),
    );
    assert.equal(ip, "203.0.113.8");
  });

  it("uses the last forwarded hop when no platform ip is set", () => {
    const ip = clientIp(headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }));
    assert.equal(ip, "203.0.113.9");
  });
});
