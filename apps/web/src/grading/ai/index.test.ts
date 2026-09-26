// PRD F9 — AI resilience tests (hard rule §3.4 suite 5). No test calls the
// real Gemini API — `fetch` is mocked and replayed through the real
// generate()/retry/timeout logic. A grade is never fabricated on failure:
// every failing path here returns `Result.ok === false`, never invented data.

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generate } from "./index";

const schema = z.object({ ok: z.boolean() });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generate — retry and failure handling", () => {
  it("succeeds on the retry after one bad-JSON response", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        return { ok: true, json: async () => (call === 1 ? { wrong: "shape" } : { ok: true }) };
      }),
    );

    const result = await generate("grader", {}, schema);
    expect(result.ok).toBe(true);
    expect(call).toBe(2);
  });

  it("returns GEMINI_BAD_JSON after two bad-JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ wrong: "shape" }) })),
    );

    const result = await generate("grader", {}, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("GEMINI_BAD_JSON");
  });

  it("returns GEMINI_FAILED after two network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const result = await generate("grader", {}, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("GEMINI_FAILED");
  });

  it("returns GEMINI_FAILED (never fabricates a value) when the proxy responds non-OK twice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) })),
    );

    const result = await generate("grader", {}, schema);
    expect(result.ok).toBe(false);
  });
});
