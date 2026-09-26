// PRD F12 — Clear Feedback: fallback-feedback unit tests. Every string must
// be plain text, short and actionable (UI/UX accessibility rules).

import { describe, expect, it } from "vitest";
import type { RubricPoint, RubricResult, RunResult, TestResult } from "../../contracts";
import { fallbackFeedbackForCode, fallbackFeedbackForRubric } from "./fallback-feedback";

function testResult(overrides: Partial<TestResult>): TestResult {
  return { testId: "t2", passed: false, timedOut: false, ...overrides };
}

describe("fallbackFeedbackForCode", () => {
  it("builds an 'expected X, got Y'-shaped message from the first failure", () => {
    const failure = testResult({ expected: "4", actual: "5" });
    const run: RunResult = { passed: false, results: [failure], runtimeMs: 10, firstFailure: failure };
    const feedback = fallbackFeedbackForCode(run);
    expect(feedback.whyWrong).toBe("Expected 4, but got 5.");
    expect(feedback.whatHappened).toContain("t2");
  });

  it("builds a timeout-specific message for a timed-out test", () => {
    const failure = testResult({ timedOut: true });
    const run: RunResult = { passed: false, results: [failure], runtimeMs: 2000, firstFailure: failure };
    const feedback = fallbackFeedbackForCode(run);
    expect(feedback.whatHappened).toContain("too long");
  });

  it("falls back to a generic message when there is no failure detail at all", () => {
    const run: RunResult = { passed: false, results: [], runtimeMs: 0 };
    const feedback = fallbackFeedbackForCode(run);
    expect(feedback.whatHappened).toBeTruthy();
    expect(feedback.nextDrill).toBeTruthy();
  });
});

describe("fallbackFeedbackForRubric", () => {
  const points: RubricPoint[] = [
    { id: "rp_1", text: "Names BFS and says why it gives the shortest path", required: true },
  ];

  it("lists the unmet point's own text, never a fabricated specific", () => {
    const rubric: RubricResult[] = [{ pointId: "rp_1", spans: [], quoteMatched: false, verifierYes: false, met: false }];
    const feedback = fallbackFeedbackForRubric(rubric, points);
    expect(feedback.missing).toContain("Names BFS and says why it gives the shortest path");
  });

  it("falls back to a generic message when the unmet point's text can't be resolved", () => {
    const rubric: RubricResult[] = [{ pointId: "rp_unknown", spans: [], quoteMatched: false, verifierYes: false, met: false }];
    const feedback = fallbackFeedbackForRubric(rubric, points);
    expect(feedback.whatHappened).toBeTruthy();
  });
});
