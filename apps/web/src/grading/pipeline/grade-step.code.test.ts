// PRD F9/F12 — gradeStep's code-step dispatch path, with `runCode` mocked
// (the real Worker runner needs a browser environment — see
// docs/RUNNER_SPIKE.md) and the Explainer mocked to fail so the deterministic
// fallback feedback path is exercised too.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Question, RunResult, TestResult } from "../../contracts";
import { gradeStep } from "./grade-step";

const question: Question = {
  id: "q1",
  topicId: "tp",
  track: "technical",
  role: "probe",
  prompt: "Solve it",
  lang: "python",
  rubrics: {},
  targetTimeMs: {},
  tests: [{ id: "t1", input: "1", expected: "1", hidden: false }],
};

vi.mock("../runner", () => ({ runCode: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("gradeStep — code step", () => {
  it("returns passed:true with no feedback when the run passes", async () => {
    const { runCode } = await import("../runner");
    const okRun: RunResult = { passed: true, results: [{ testId: "t1", passed: true, timedOut: false }], runtimeMs: 5 };
    vi.mocked(runCode).mockResolvedValueOnce(okRun);

    const grade = await gradeStep(question, "apply", "print(1)");
    expect(grade.passed).toBe(true);
    expect(grade.feedback).toBeUndefined();
  });

  it("attaches fallback feedback (Explainer failing) when the run fails", async () => {
    const { runCode } = await import("../runner");
    const failure: TestResult = { testId: "t1", passed: false, timedOut: false, expected: "1", actual: "2" };
    const failRun: RunResult = { passed: false, results: [failure], runtimeMs: 5, firstFailure: failure };
    vi.mocked(runCode).mockResolvedValueOnce(failRun);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("proxy down");
      }),
    );

    const grade = await gradeStep(question, "apply", "print(2)");
    expect(grade.passed).toBe(false);
    expect(grade.feedback?.whyWrong).toBe("Expected 1, but got 2.");
  });
});

describe("gradeStep — Apply/Transfer on a question with no lang (e.g. Project Explanation)", () => {
  it("grades as a rubric step instead of throwing (docs/BACKEND2_GRADING_HANDOFF.md blocker)", async () => {
    const openEndedQuestion: Question = {
      ...question,
      lang: undefined,
      tests: undefined,
      rubrics: { apply: [{ id: "p1", text: "Names a specific bottleneck", required: true }] },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/v1/grade")) {
          return { ok: true, json: async () => ({ points: [{ pointId: "p1", spans: ["the database is the bottleneck"] }] }) };
        }
        if (url.endsWith("/v1/verify")) {
          return { ok: true, json: async () => ({ pointId: "p1", satisfied: true, reason: "specific" }) };
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const grade = await gradeStep(openEndedQuestion, "apply", "the database is the bottleneck at scale");
    expect(grade.run).toBeUndefined();
    expect(grade.rubric?.[0]?.met).toBe(true);
    expect(grade.passed).toBe(true);
  });
});

describe("gradeStep — rubric step failure path attaches feedback", () => {
  it("calls explain (and returns its fallback) when a rubric step fails", async () => {
    const rubricQuestion: Question = { ...question, rubrics: { recognize: [{ id: "p1", text: "Names BFS", required: true }] } };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/v1/grade")) return { ok: true, json: async () => ({ points: [{ pointId: "p1", spans: [] }] }) };
        throw new Error("explainer down");
      }),
    );
    const grade = await gradeStep(rubricQuestion, "recognize", "I used DFS instead.");
    expect(grade.passed).toBe(false);
    expect(grade.feedback?.missing).toContain("Names BFS");
  });
});
