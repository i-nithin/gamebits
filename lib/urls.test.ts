import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeHttpsUrl } from "./urls";

describe("sanitizeHttpsUrl", () => {
  it("keeps a public https url", () => {
    assert.equal(sanitizeHttpsUrl("https://example.com/play"), "https://example.com/play");
  });

  it("rejects private, loopback, and link-local hosts", () => {
    assert.equal(sanitizeHttpsUrl("https://127.0.0.1/admin"), null);
    assert.equal(sanitizeHttpsUrl("https://10.1.2.3/"), null);
    assert.equal(sanitizeHttpsUrl("https://192.168.0.5/"), null);
    assert.equal(sanitizeHttpsUrl("https://169.254.169.254/"), null);
    assert.equal(sanitizeHttpsUrl("https://localhost/"), null);
    assert.equal(sanitizeHttpsUrl("http://example.com/"), null);
  });
});
