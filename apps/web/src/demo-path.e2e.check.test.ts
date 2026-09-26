// One-off verification (not wired into the coverage-gated suites): drives the
// REAL engine (Uthai's createSessionModule, default gradeStep wiring — NOT
// the engine test-only `fakeGrade` stand-in) through the REAL grading
// pipeline (Suchit's grading/pipeline), across the full M2 gate script
// (Team Plan §3.2): probe -> amber -> confirm -> red -> drill -> re-test ->
// green, on the real seed BFS question. Note: the API Contract §5.2 "expected
// 4, got 5" phrasing describes the separate MOCK data's scripted sequence,
// not this real seed question — its real hidden test expects 3, not 4 (found
// by actually running this, see the comment at that assertion below).
// Two things are mocked, both documented real-code limitations, not gaps:
//   - global fetch (the ai-proxy call) — no live Gemini key in this sandbox.
//   - grading/runner/runner-client (the real Worker) — Pyodide needs a real
//     browser/worker environment (docs/RUNNER_SPIKE.md), same substitution
//     runner/index.test.ts already uses for its own unit tests.
// Everything else — engine<->grading wiring via the lazy `defaultGradeStep`
// import, ladder transitions, gap/readiness/plan updates, and the real
// rubric pipeline's quote-matcher + Verifier gate — is the shipped code.

import { afterEach, describe, expect, it, vi } from "vitest";
import type { RunResult, TestCase } from "./contracts";
import { InMemoryRepository } from "./engine/store";
import { createSessionModule } from "./engine/session";
import { createReadinessModule } from "./engine/readiness";
import { createPlannerModule } from "./engine/planner";

const runInWorker = vi.fn<(code: string, lang: string, tests: TestCase[]) => Promise<RunResult>>();
vi.mock("./grading/runner/runner-client", () => ({
  preload: vi.fn(async () => ({ ready: true })),
  runInWorker: (...args: Parameters<typeof runInWorker>) => runInWorker(...args),
}));

function passRun(tests: TestCase[]): RunResult {
  return { passed: true, results: tests.map((t) => ({ testId: t.id, passed: true, timedOut: false })), runtimeMs: 5 };
}
function failRun(tests: TestCase[], actual: string): RunResult {
  const firstFailure = { testId: tests[0]!.id, passed: false, timedOut: false, expected: tests[0]!.expected, actual };
  return {
    passed: false,
    results: [firstFailure, ...tests.slice(1).map((t) => ({ testId: t.id, passed: false, timedOut: false }))],
    runtimeMs: 5,
    firstFailure,
  };
}

function mockAiProxy(handler: (route: string, input: { step?: string; point?: { id: string } }) => unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const route = url.includes("/v1/") ? url.slice(url.indexOf("/v1/")) : url;
      const input = init?.body ? JSON.parse(init.body as string) : undefined;
      return { ok: true, json: async () => handler(route, input) };
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PRD 8.3 demo path — real engine + real grading wired together, AI proxy and Worker mocked", () => {
  it("probe ladder: recognize pass -> apply fail (4->5) -> explain pass (evidence) -> transfer fail -> done, with readiness/gaps/plan updated", async () => {
    const repo = new InMemoryRepository();
    const now = () => new Date(2026, 8, 26, 9, 0, 0);
    const session = createSessionModule(repo, { now });
    const readiness = createReadinessModule(repo);
    const planner = createPlannerModule(repo, { now });

    const student = await session.createStudent({
      name: "Asha",
      companyId: "co_zoho",
      driveDate: "2026-10-03",
      hoursPerDay: 3,
      scope: "sprint",
    });

    mockAiProxy((route, input) => {
      if (route === "/v1/grade") {
        if (input.step === "recognize") {
          return {
            points: [
              { pointId: "bfs_r1", spans: ["BFS explores level by level"] },
              { pointId: "bfs_r2", spans: ["reaches nodes in order of distance"] },
            ],
          };
        }
        if (input.step === "explain") {
          return { points: [{ pointId: "bfs_e1", spans: ["the first time BFS reaches a node is along a shortest path"] }] };
        }
        return { points: [] };
      }
      if (route === "/v1/verify") return { pointId: input.point?.id, satisfied: true, reason: "clear" };
      throw new Error(`unexpected route ${route}`);
    });

    const { ladder: probeLadder, question } = await session.startLadder(student.id, "tp_graphs", "probe");
    expect(probeLadder.current).toBe("recognize");
    console.log(`Probe ladder started on ${question.id}, step: ${probeLadder.current}`);

    // 1. Recognize — real Grader+Verifier+quote-matcher pipeline, real pass.
    const recognizeAnswer =
      "BFS explores level by level, reaching nodes in order of distance, which guarantees the fewest-edge path.";
    const r1 = await session.submitStep(probeLadder.id, recognizeAnswer, 40_000);
    console.log(`1. recognize -> passed=${r1.grade.passed}, next=${r1.ladder.current}`);
    expect(r1.grade.passed).toBe(true);
    expect(r1.ladder.current).toBe("apply");

    // 2. Apply — real runCode dispatch (Worker mocked). Two things confirmed
    // by actually running this, not assumed: (a) startLadder redacts hidden
    // tests' `expected` before returning the question to the caller (so
    // `question.tests` here — the frontend-facing shape — has t2's expected
    // blanked; the real, ungated expected values below come straight from
    // the seed JSON, not from `question`), and (b) the API Contract §5.2
    // "expected 4, got 5" phrasing describes the MOCK data's scripted
    // sequence, not Uthai's real seed question — the real seed's hidden test
    // t2 expects "3", not "4".
    const failingTests: TestCase[] = [
      { id: "t2", input: "", expected: "3", hidden: true },
      { id: "t1", input: "", expected: "1", hidden: false },
      { id: "t3", input: "", expected: "-1", hidden: true },
      { id: "t4", input: "", expected: "0", hidden: true },
    ];
    runInWorker.mockResolvedValueOnce(failRun(failingTests, "5"));
    const r2 = await session.submitStep(probeLadder.id, "def shortest_path(graph, start, target):\n    return 5\n", 200_000);
    console.log(`2. apply -> passed=${r2.grade.passed}, firstFailure=${JSON.stringify(r2.grade.run?.firstFailure)}`);
    console.log(`   feedback.whyWrong: "${r2.grade.feedback?.whyWrong}"`);
    console.log(`   gapsChanged: ${r2.gapsChanged.map((g) => `${g.type}:${g.status}`).join(", ")}`);
    expect(r2.grade.passed).toBe(false);
    expect(r2.grade.run?.firstFailure).toMatchObject({ testId: "t2", expected: "3", actual: "5" });
    expect(r2.grade.feedback?.whyWrong).toBe("Expected 3, but got 5.");
    expect(r2.gapsChanged.length).toBeGreaterThan(0);

    // 3. Explain — real pipeline, real quoted evidence surfaced from the answer.
    const explainAnswer = "Because the first time BFS reaches a node is along a shortest path in an unweighted graph.";
    const r3 = await session.submitStep(probeLadder.id, explainAnswer, 60_000);
    console.log(`3. explain -> passed=${r3.grade.passed}, evidence="${r3.grade.rubric?.[0]?.spans[0]}"`);
    expect(r3.grade.passed).toBe(true);
    expect(r3.grade.rubric?.[0]?.spans[0]).toContain("the first time BFS reaches a node is along a shortest path");

    // 4. Transfer — real runCode dispatch again, forced fail to finish the demo script.
    runInWorker.mockResolvedValueOnce(failRun(question.variant!.tests, "999"));
    const r4 = await session.submitStep(probeLadder.id, "def cheapest_path(graph, start, target):\n    return 999\n", 200_000);
    console.log(`4. transfer -> passed=${r4.grade.passed}, ladder.current=${r4.ladder.current}`);
    expect(r4.grade.passed).toBe(false);
    expect(r4.ladder.current).toBe("done");

    // Readiness, gaps and the plan are real, derived state — not asserted by a stand-in.
    const map = await readiness.getReadinessMap(student.id);
    const graphsRow = map.technical.find((row) => row.topic.id === "tp_graphs");
    console.log(`Readiness (tp_graphs) after probe: ${JSON.stringify(graphsRow?.cells)}`);
    expect(graphsRow?.cells.recognize.state).toBe("green");
    expect(graphsRow?.cells.apply.state).not.toBe("grey");
    expect(graphsRow?.cells.explain.state).toBe("green");

    const plan = await planner.getPlan(student.id);
    const totalItems = plan.days.reduce((n, d) => n + d.items.length, 0);
    console.log(`Plan replanned to ${totalItems} item(s) across ${plan.days.length} day(s).`);
    expect(totalItems).toBeGreaterThan(0);

    const nextTask = await planner.getNextTask(student.id);
    console.log(`Next task after the probe ladder: ${JSON.stringify(nextTask)}`);
    expect(nextTask).toBeTruthy();
    expect(nextTask?.kind).toBe("confirm");
    const gapId = nextTask?.gapId;
    expect(gapId).toBeTruthy();

    // --- M2 gate, continued: confirm ladder fails -> gap confirmed, cell red.
    const { ladder: confirmLadder, question: confirmQuestion } = await session.startLadder(
      student.id,
      "tp_graphs",
      "confirm",
      "apply",
    );
    console.log(`\nConfirm ladder started on ${confirmQuestion.id}, step: ${confirmLadder.current}`);
    runInWorker.mockResolvedValueOnce(failRun(confirmQuestion.tests!, "wrong"));
    const rc = await session.submitStep(confirmLadder.id, "def buggy(): ...", 200_000);
    console.log(`confirm/apply -> passed=${rc.grade.passed}, gapsChanged=${rc.gapsChanged.map((g) => g.status).join(",")}`);
    expect(rc.grade.passed).toBe(false);
    expect(rc.gapsChanged.some((g) => g.status === "confirmed")).toBe(true);

    const mapAfterConfirm = await readiness.getReadinessMap(student.id);
    const applyStateAfterConfirm = mapAfterConfirm.technical.find((r) => r.topic.id === "tp_graphs")?.cells.apply.state;
    console.log(`Readiness apply cell after confirm fail: ${applyStateAfterConfirm}`);
    expect(applyStateAfterConfirm).toBe("red");

    // --- Drill ---------------------------------------------------------
    const drills = (await import("./engine/drills")).createDrillsModule(repo);
    const drill = await drills.getDrill(gapId!);
    console.log(`Drill assigned: ${drill.kind} — "${drill.title}"`);
    expect(drill).toBeTruthy();

    // --- Re-test passes -> gap fixed, cell green. -----------------------
    const { ladder: retestLadder, question: retestQuestion } = await session.startLadder(
      student.id,
      "tp_graphs",
      "retest",
      "apply",
    );
    console.log(`Re-test ladder started on ${retestQuestion.id}, step: ${retestLadder.current}`);
    runInWorker.mockResolvedValueOnce(passRun(retestQuestion.tests!));
    const rr = await session.submitStep(retestLadder.id, "def fixed(): ...", 200_000);
    console.log(`retest/apply -> passed=${rr.grade.passed}, gapsChanged=${rr.gapsChanged.map((g) => g.status).join(",")}`);
    expect(rr.grade.passed).toBe(true);
    expect(rr.gapsChanged.some((g) => g.status === "fixed")).toBe(true);

    const mapAfterRetest = await readiness.getReadinessMap(student.id);
    const applyStateAfterRetest = mapAfterRetest.technical.find((r) => r.topic.id === "tp_graphs")?.cells.apply.state;
    console.log(`Readiness apply cell after re-test pass: ${applyStateAfterRetest}`);
    expect(applyStateAfterRetest).toBe("green");

    console.log("\n=== Full PRD 8.3 demo path (probe -> amber -> confirm -> red -> drill -> re-test -> green) verified against real engine + real grading. ===");
  });
});
