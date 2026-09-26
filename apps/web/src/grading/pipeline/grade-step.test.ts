// PRD F9/F12 — Demo-path integration tests using the real seed BFS question
// (apps/web/src/data/questions/graphs/bfs-shortest-path.json) and a mocked
// AI layer (fetch), per this task's Definition of Done:
//  1. a BFS off-by-one failure produces "expected 4, got 5"-shaped feedback
//     (via the deterministic fallback, since the real Worker runner is out
//     of scope for this pass — see docs/RUNNER_SPIKE.md);
//  2. an Explain-step pass shows quoted evidence;
//  3. the Verifier rejects a vague Project Defense answer.

import { afterEach, describe, expect, it, vi } from "vitest";
import bfsQuestionJson from "../../data/questions/graphs/bfs-shortest-path.json";
import type { ProjectQuestion, Question, RunResult, TestResult } from "../../contracts";
import { explain } from "./explain";
import { gradeStep } from "./grade-step";
import { gradeProjectAnswer } from "../project/grade-answer";

const bfsQuestion = bfsQuestionJson as unknown as Question;

type FetchBody = { promptId: string; input: unknown };

const ROUTE_TO_PROMPT_ID: Record<string, string> = {
  "/v1/grade": "grader",
  "/v1/verify": "verifier",
  "/v1/explain": "explainer",
  "/v1/project-questions": "project-question-generator",
};

function mockAiProxy(handler: (body: FetchBody) => unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const route = Object.keys(ROUTE_TO_PROMPT_ID).find((r) => url.endsWith(r));
      const promptId = route ? ROUTE_TO_PROMPT_ID[route]! : "unknown";
      const input: unknown = JSON.parse(init.body as string);
      return { ok: true, json: async () => handler({ promptId, input }) };
    }),
  );
}

function mockAiProxyAlwaysFails(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("proxy unreachable");
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("demo path 1 — a BFS off-by-one failure produces clear, specific feedback", () => {
  it("explain()'s fallback turns a firstFailure of expected 4 / got 5 into that exact sentence", async () => {
    mockAiProxyAlwaysFails();
    const failure: TestResult = { testId: "t2", passed: false, timedOut: false, expected: "4", actual: "5" };
    const run: RunResult = { passed: false, results: [failure], runtimeMs: 42, firstFailure: failure };
    const feedback = await explain(bfsQuestion, "apply", "def shortest_path(...): ...", { step: "apply", passed: false, run });
    expect(feedback.whyWrong).toBe("Expected 4, but got 5.");
  });
});

describe("demo path 2 — an Explain-step pass shows quoted evidence", () => {
  it("gradeStep returns matched spans as evidence when the step passes", async () => {
    mockAiProxy((body) => {
      if (body.promptId === "grader") {
        return { points: [{ pointId: "rp_2", spans: ["BFS explores level by level, so the first time it reaches the target is via the fewest edges"] }] };
      }
      if (body.promptId === "verifier") return { pointId: "rp_2", satisfied: true, reason: "clearly explained" };
      throw new Error(`unexpected promptId ${body.promptId}`);
    });

    const answer = "BFS explores level by level, so the first time it reaches the target is via the fewest edges, which is why it's the shortest path.";
    const grade = await gradeStep(bfsQuestion, "explain", answer);

    expect(grade.passed).toBe(true);
    expect(grade.rubric?.[0]?.met).toBe(true);
    expect(grade.rubric?.[0]?.spans[0]).toContain("BFS explores level by level");
  });
});

describe("demo path 3 — the Verifier rejects a vague Project Defense answer", () => {
  it("a vague answer with no real evidence is not awarded, and feedback names what's missing", async () => {
    const pq: ProjectQuestion = {
      id: "pq_1",
      area: "architecture",
      text: "Walk me through how your service handles a request end to end.",
      rubric: [{ id: "rpq_1_0", text: "Describes the request path through at least two named components", required: true }],
    };
    mockAiProxy((body) => {
      if (body.promptId === "grader") return { points: [{ pointId: "rpq_1_0", spans: [] }] };
      if (body.promptId === "explainer") {
        return {
          whatHappened: "Your answer did not describe the request path.",
          whyWrong: "We could not find which components handle the request.",
          missing: "Describes the request path through at least two named components",
          nextDrill: "Name the components and the order requests pass through them.",
        };
      }
      throw new Error(`unexpected promptId ${body.promptId}`);
    });

    const projectText = "It's a web app with a frontend and a backend and a database, pretty standard stuff.";
    const vagueAnswer = "It just works, requests go through the system and come back with the result.";

    const { grade, card } = await gradeProjectAnswer(pq, projectText, vagueAnswer);

    expect(grade.passed).toBe(false);
    expect(card.strong).toBe(false);
    expect(card.missing).toContain("Describes the request path through at least two named components");
  });
});
