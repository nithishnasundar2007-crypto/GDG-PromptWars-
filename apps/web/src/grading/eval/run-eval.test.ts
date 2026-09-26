// PRD §8.4 — runEval unit test against a small SYNTHETIC labelled set (hard
// rule §3.4: "runEval is exercised in its own test with a small synthetic
// labelled set... not the real 30"). Proves the metric-calculation code is
// correct; the real 30-answer run lives in eval/labelled-answers/labelled.json
// and is exercised separately via `npm run eval -w web` (run-eval.ondemand.eval.ts),
// not as part of this Vitest suite.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { LabelledAnswer } from "./types";
import { runEval } from "./run-eval";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ROUTE_TO_PROMPT_ID: Record<string, string> = {
  "/v1/grade": "grader",
  "/v1/verify": "verifier",
};

/**
 * A deterministic fixture AI layer: the mock Grader returns the literal
 * answer as the span whenever the human label says a point is met (so it's
 * guaranteed to quote-match), and nothing otherwise; the mock Verifier
 * always agrees with the label. This is intentionally simple — it exists to
 * prove the metric math and pipeline wiring are correct, not to simulate a
 * real Gemini's accuracy (see docs/BACKEND1_REPORT.md).
 */
function mockPerfectAiLayer(labelled: LabelledAnswer[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const route = Object.keys(ROUTE_TO_PROMPT_ID).find((r) => url.endsWith(r));
      const promptId = route ? ROUTE_TO_PROMPT_ID[route] : "unknown";
      const input = JSON.parse(init.body as string) as { answer?: string; rubricPoints?: { id: string }[]; point?: { id: string } };

      if (promptId === "grader") {
        const item = labelled.find((l) => l.answer === input.answer);
        const points = (input.rubricPoints ?? []).map((p) => ({
          pointId: p.id,
          spans: item?.humanPointLabels[p.id] ? [item.answer] : [],
        }));
        return { ok: true, json: async () => ({ points }) };
      }
      // verifier
      const pointId = input.point?.id ?? "";
      const item = labelled.find((l) => pointId in l.humanPointLabels);
      const satisfied = item ? (item.humanPointLabels[pointId] ?? false) : false;
      return { ok: true, json: async () => ({ pointId, satisfied, reason: "fixture" }) };
    }),
  );
}

const SYNTHETIC_SET: LabelledAnswer[] = [
  {
    id: "e1",
    question: "Why does BFS give the shortest path?",
    step: "explain",
    rubric: [{ id: "p1", text: "Explains level-by-level exploration", required: true }],
    answer: "BFS explores level by level so the first time it reaches a node is via the fewest edges.",
    humanPointLabels: { p1: true },
    humanStepPass: true,
    tags: ["explain"],
  },
  {
    id: "e2",
    question: "Why does BFS give the shortest path?",
    step: "explain",
    rubric: [{ id: "p1", text: "Explains level-by-level exploration", required: true }],
    answer: "I used DFS, it's simpler to code and I like recursion.",
    humanPointLabels: { p1: false },
    humanStepPass: false,
    tags: ["explain", "vague"],
  },
  {
    id: "e3",
    question: "Describe your project's architecture.",
    step: "explain",
    rubric: [{ id: "p1", text: "Names at least two components", required: true }],
    answer: "It has a frontend built with React and a backend API written in Node.",
    humanPointLabels: { p1: true },
    humanStepPass: true,
    tags: ["project"],
  },
  {
    id: "e4",
    question: "Describe your project's architecture.",
    step: "explain",
    rubric: [{ id: "p1", text: "Names at least two components", required: true }],
    answer: "It just works, honestly not sure how to explain it.",
    humanPointLabels: { p1: false },
    humanStepPass: false,
    tags: ["project", "vague"],
  },
];

describe("runEval — metric math on a small synthetic set", () => {
  it("computes perfect agreement when the fixture AI layer always matches the human label", async () => {
    mockPerfectAiLayer(SYNTHETIC_SET);
    const result = await runEval(SYNTHETIC_SET);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.totalAnswers).toBe(4);
    expect(result.data.totalPoints).toBe(4);
    expect(result.data.agreementRate).toBe(1);
    expect(result.data.falseAwardRate).toBe(0);
    expect(result.data.falseRejectRate).toBe(0);
    expect(result.data.confusion.truePositive).toBe(2);
    expect(result.data.confusion.trueNegative).toBe(2);
  });

  it("returns an error for an empty labelled set rather than a fabricated report", async () => {
    const result = await runEval([]);
    expect(result.ok).toBe(false);
  });
});
