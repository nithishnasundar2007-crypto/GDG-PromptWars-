// PRD F10 — Say-It Practice: transcribe input-limit, scope-gating, and proxy
// call tests. No test calls the real Gemini API — fetch is mocked.

import { afterEach, describe, expect, it, vi } from "vitest";
import { GradingError as StaticGradingError } from "../errors";

function audioBlob(bytes: number, type = "audio/webm"): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock("../../config");
});

describe("transcribe — scope gating (default sprint scope)", () => {
  it("rejects outside two-week scope", async () => {
    const { transcribe } = await import("./index");
    await expect(transcribe(audioBlob(100))).rejects.toBeInstanceOf(StaticGradingError);
  });
});

describe("transcribe — input validation (two-week scope)", () => {
  // `vi.resetModules()` gives each test a fresh module registry, so
  // GradingError must be re-imported from THAT registry too — otherwise
  // `instanceof` fails across the two separately-instantiated classes.
  async function loadTranscribeInTwoWeekScope() {
    vi.resetModules();
    vi.doMock("../../config", () => ({ config: { scope: "two-week", aiProxyUrl: "http://proxy.test" } }));
    const [{ transcribe }, { GradingError }] = await Promise.all([import("./index"), import("../errors")]);
    return { transcribe, GradingError };
  }

  it("rejects an empty recording", async () => {
    const { transcribe, GradingError } = await loadTranscribeInTwoWeekScope();
    await expect(transcribe(audioBlob(0))).rejects.toBeInstanceOf(GradingError);
  });

  it("rejects an oversized recording", async () => {
    const { transcribe, GradingError } = await loadTranscribeInTwoWeekScope();
    await expect(transcribe(audioBlob(11 * 1024 * 1024))).rejects.toBeInstanceOf(GradingError);
  });

  it("rejects an unsupported MIME type", async () => {
    const { transcribe, GradingError } = await loadTranscribeInTwoWeekScope();
    await expect(transcribe(audioBlob(100, "video/mp4"))).rejects.toBeInstanceOf(GradingError);
  });

  it("calls the proxy and returns the transcript on success", async () => {
    const { transcribe } = await loadTranscribeInTwoWeekScope();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ text: "hello world" }) })));
    const result = await transcribe(audioBlob(100));
    expect(result).toEqual({ text: "hello world" });
  });

  it("throws GEMINI_FAILED when the proxy responds non-OK", async () => {
    const { transcribe, GradingError } = await loadTranscribeInTwoWeekScope();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502 })));
    await expect(transcribe(audioBlob(100))).rejects.toBeInstanceOf(GradingError);
  });

  it("throws GEMINI_BAD_JSON when the proxy response is malformed", async () => {
    const { transcribe, GradingError } = await loadTranscribeInTwoWeekScope();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ notText: true }) })));
    await expect(transcribe(audioBlob(100))).rejects.toBeInstanceOf(GradingError);
  });
});
