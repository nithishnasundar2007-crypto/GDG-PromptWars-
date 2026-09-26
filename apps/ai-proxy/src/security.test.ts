// PRD §3.2 — App Check verification. Real Firebase enforcement is
// unverifiable in this sandbox (no live project/credentials — see
// docs/SECURITY.md); this test exercises the injectable verifier seam
// instead, proving the dev-bypass / real-verifier branching is correct.
// `config.appCheckDevBypass` is mocked per test (via vi.doMock + a fresh
// dynamic import) since it's normally fixed by env at process start.

import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("./config.js");
});

async function loadSecurityWithBypass(appCheckDevBypass: boolean) {
  vi.doMock("./config.js", () => ({
    config: { appCheckDevBypass, firebaseProjectId: undefined },
  }));
  return import("./security.js");
}

describe("verifyAppCheckToken", () => {
  it("dev bypass mode always returns true, even with no token", async () => {
    const { verifyAppCheckToken } = await loadSecurityWithBypass(true);
    expect(await verifyAppCheckToken(undefined)).toBe(true);
  });

  it("with bypass off, rejects a missing token without calling the verifier", async () => {
    const { verifyAppCheckToken } = await loadSecurityWithBypass(false);
    const verifier = vi.fn(async () => true);
    expect(await verifyAppCheckToken(undefined, verifier)).toBe(false);
    expect(verifier).not.toHaveBeenCalled();
  });

  it("with bypass off and a present token, defers to the injected verifier's true", async () => {
    const { verifyAppCheckToken } = await loadSecurityWithBypass(false);
    expect(await verifyAppCheckToken("a-token", async () => true)).toBe(true);
  });

  it("with bypass off and a present token, defers to the injected verifier's false", async () => {
    const { verifyAppCheckToken } = await loadSecurityWithBypass(false);
    expect(await verifyAppCheckToken("a-token", async () => false)).toBe(false);
  });
});
