// PRD §3.2 — exercises security.ts's real (default, non-injected) firebase-
// admin App Check path with firebase-admin itself mocked (no live Firebase
// project in this sandbox — see docs/SECURITY.md). Proves the wiring
// (lazy import, initializeApp-once, verifyToken success/failure -> boolean)
// is correct; it does NOT prove real Firebase enforcement works.

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("./config.js");
  vi.doUnmock("firebase-admin/app");
  vi.doUnmock("firebase-admin/app-check");
});

async function loadSecurityWithMockedFirebaseAdmin(verifyToken: () => Promise<unknown>, existingApps: unknown[] = []) {
  vi.doMock("./config.js", () => ({ config: { appCheckDevBypass: false, firebaseProjectId: "demo-project" } }));
  vi.doMock("firebase-admin/app", () => ({
    initializeApp: vi.fn(),
    getApps: vi.fn(() => existingApps),
  }));
  vi.doMock("firebase-admin/app-check", () => ({
    getAppCheck: vi.fn(() => ({ verifyToken })),
  }));
  return import("./security.js");
}

describe("verifyAppCheckToken — real firebase-admin path (mocked)", () => {
  it("returns true when firebase-admin's verifyToken succeeds", async () => {
    const { verifyAppCheckToken } = await loadSecurityWithMockedFirebaseAdmin(async () => ({ appId: "x" }));
    expect(await verifyAppCheckToken("a-real-looking-token")).toBe(true);
  });

  it("returns false when firebase-admin's verifyToken rejects", async () => {
    const { verifyAppCheckToken } = await loadSecurityWithMockedFirebaseAdmin(async () => {
      throw new Error("invalid token");
    });
    expect(await verifyAppCheckToken("a-bad-token")).toBe(false);
  });

  it("skips initializeApp when an app already exists", async () => {
    const { verifyAppCheckToken } = await loadSecurityWithMockedFirebaseAdmin(async () => ({}), [{}]);
    const { initializeApp } = await import("firebase-admin/app");
    await verifyAppCheckToken("token");
    expect(vi.mocked(initializeApp)).not.toHaveBeenCalled();
  });
});
