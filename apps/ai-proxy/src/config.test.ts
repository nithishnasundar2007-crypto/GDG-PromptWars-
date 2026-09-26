// PRD §7 — config.ts's env validation, including the failure path.

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("config", () => {
  it("throws a clear error when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(import("./config.js")).rejects.toThrow(/Invalid ai-proxy environment configuration/);
  });
});
