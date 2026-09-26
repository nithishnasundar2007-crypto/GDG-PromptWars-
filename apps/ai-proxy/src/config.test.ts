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

describe("APP_CHECK_DEV_BYPASS default (a real deployment must be protected without remembering a flag)", () => {
  it("defaults to bypass ON outside production", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_CHECK_DEV_BYPASS", undefined);
    const { config } = await import("./config.js");
    expect(config.appCheckDevBypass).toBe(true);
  });

  it("defaults to bypass OFF when NODE_ENV=production and no override is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_CHECK_DEV_BYPASS", undefined);
    const { config } = await import("./config.js");
    expect(config.appCheckDevBypass).toBe(false);
  });

  it("an explicit APP_CHECK_DEV_BYPASS=false wins even outside production", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_CHECK_DEV_BYPASS", "false");
    const { config } = await import("./config.js");
    expect(config.appCheckDevBypass).toBe(false);
  });

  it("an explicit APP_CHECK_DEV_BYPASS=true wins even in production", async () => {
    vi.stubEnv("GEMINI_API_KEY", "key");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_CHECK_DEV_BYPASS", "true");
    const { config } = await import("./config.js");
    expect(config.appCheckDevBypass).toBe(true);
  });
});
