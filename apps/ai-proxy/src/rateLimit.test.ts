// Token-bucket rate limiter unit tests.

import { afterEach, describe, expect, it, vi } from "vitest";
import { allow } from "./rateLimit.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("allow", () => {
  it("allows requests up to the configured capacity, then rejects", () => {
    const clientId = `client-${Math.random()}`;
    // RATE_LIMIT_PER_MIN=60 in the test env (vitest.config.ts).
    for (let i = 0; i < 60; i++) expect(allow(clientId)).toBe(true);
    expect(allow(clientId)).toBe(false);
  });

  it("refills the bucket after the refill window elapses", () => {
    vi.useFakeTimers();
    const clientId = `client-${Math.random()}`;
    for (let i = 0; i < 60; i++) allow(clientId);
    expect(allow(clientId)).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(allow(clientId)).toBe(true);
  });
});
