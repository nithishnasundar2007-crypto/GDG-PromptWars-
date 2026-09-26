// PRD F8 — generateProjectQuestions tests. fetch is mocked (no real Gemini).

import { afterEach, describe, expect, it, vi } from "vitest";
import { clearProjectQuestionCache } from "./cache";
import { generateProjectQuestions } from "./generate-questions";
import { GradingError } from "../errors";

function sixQuestions() {
  return {
    questions: Array.from({ length: 6 }, (_, i) => ({
      area: "architecture" as const,
      text: `Question ${i}`,
      rubric: [{ text: "point", required: true }],
    })),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearProjectQuestionCache();
});

describe("generateProjectQuestions", () => {
  it("rejects project text over the max length without calling the AI layer", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(generateProjectQuestions("x".repeat(20_001))).rejects.toBeInstanceOf(GradingError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the 6-8 questions Gemini produces on the first try", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => sixQuestions() })));
    const result = await generateProjectQuestions("a project about graphs");
    expect(result).toHaveLength(6);
  });

  it("caches by content so a second call with the same text skips the AI layer", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => sixQuestions() }));
    vi.stubGlobal("fetch", fetchMock);
    await generateProjectQuestions("a cached project");
    await generateProjectQuestions("a cached project");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first response is out of the 6-8 range, then trims to 8 on a second bad response", async () => {
    const tooFew = { questions: [{ area: "architecture", text: "only one", rubric: [] }] };
    const tooMany = { questions: Array.from({ length: 10 }, (_, i) => ({ area: "architecture" as const, text: `q${i}`, rubric: [] })) };
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        return { ok: true, json: async () => (call === 1 ? tooFew : tooMany) };
      }),
    );
    const result = await generateProjectQuestions("a project needing a retry");
    expect(call).toBe(2);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("throws after a failed AI call on the retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    await expect(generateProjectQuestions("a project that always fails")).rejects.toBeInstanceOf(GradingError);
  });
});
