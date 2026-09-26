// PRD F10 — Say-It Practice: transcribe input-limit and scope-gating tests.
// No test calls the real Gemini API — fetch is mocked where a proxy call
// would otherwise be needed.

import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribe } from "./index";
import { GradingError } from "../errors";

afterEach(() => {
  vi.unstubAllGlobals();
});

function audioBlob(bytes: number, type = "audio/webm"): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

describe("transcribe — input validation", () => {
  it("rejects outside two-week scope (sprint is the test default)", async () => {
    await expect(transcribe(audioBlob(100))).rejects.toBeInstanceOf(GradingError);
  });
});
