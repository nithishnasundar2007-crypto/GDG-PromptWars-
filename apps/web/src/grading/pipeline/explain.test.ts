// PRD F12 — explain() fallback-selection tests (hard rule §3.4 suite 6):
// Explainer success is used as-is; on failure, the fallback is chosen based
// on what's in `grade` (run vs. rubric vs. neither).

import { afterEach, describe, expect, it, vi } from "vitest";
import type { GradeResult, Question } from "../../contracts";
import { explain } from "./explain";

const question: Question = {
  id: "q1",
  topicId: "tp",
  track: "technical",
  role: "probe",
  prompt: "p",
  rubrics: { explain: [{ id: "rp1", text: "Names the reason", required: true }] },
  targetTimeMs: {},
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("explain", () => {
  it("returns the Explainer's own output when the call succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ whatHappened: "a", whyWrong: "b", missing: "c", nextDrill: "d" }),
      })),
    );
    const grade: GradeResult = { step: "explain", passed: false, rubric: [] };
    const feedback = await explain(question, "explain", "answer", grade);
    expect(feedback).toEqual({ whatHappened: "a", whyWrong: "b", missing: "c", nextDrill: "d" });
  });

  it("falls back to the code-based template when the Explainer fails and grade.run is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("proxy down");
      }),
    );
    const failure = { testId: "t1", passed: false, timedOut: false, expected: "4", actual: "5" };
    const grade: GradeResult = { step: "apply", passed: false, run: { passed: false, results: [failure], runtimeMs: 1, firstFailure: failure } };
    const feedback = await explain(question, "apply", "code", grade);
    expect(feedback.whyWrong).toBe("Expected 4, but got 5.");
  });

  it("falls back to the rubric-based template when the Explainer fails and grade.rubric is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("proxy down");
      }),
    );
    const grade: GradeResult = {
      step: "explain",
      passed: false,
      rubric: [{ pointId: "rp1", spans: [], quoteMatched: false, verifierYes: false, met: false }],
    };
    const feedback = await explain(question, "explain", "answer", grade);
    expect(feedback.missing).toContain("Names the reason");
  });

  it("falls back to the generic message when the Explainer fails and grade has neither run nor rubric", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("proxy down");
      }),
    );
    const grade: GradeResult = { step: "explain", passed: false };
    const feedback = await explain(question, "explain", "answer", grade);
    expect(feedback.whatHappened).toBe("We couldn't generate detailed feedback right now.");
  });
});
