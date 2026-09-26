// Proves the engine depends only on the GradeStepFn interface (deps.ts), not on
// grading internals. The grader here is a contract-typed stand-in for Suchit's
// gradeStep: it returns a RunResult for code steps and RubricResult[] for
// open-ended steps, and records every call so we can assert nothing runs twice.
import { describe, expect, it } from "vitest";
import type { AnyStep, GradeResult, Question } from "../contracts";
import type { GradeStepFn } from "./deps";
import { setup } from "./testUtils";

interface Call { questionId: string; step: AnyStep; answer: string; hadLang: boolean }

function recordingGrader(verdict: (call: Call) => boolean) {
  const calls: Call[] = [];
  const grade: GradeStepFn = async (q: Question, step: AnyStep, answer: string): Promise<GradeResult> => {
    const call = { questionId: q.id, step, answer, hadLang: q.lang !== undefined };
    calls.push(call);
    const passed = verdict(call);
    const feedback = passed ? undefined : { whatHappened: "w", whyWrong: "y", missing: "m", nextDrill: "d" };
    const codeStep = (step === "apply" || step === "transfer") && q.lang !== undefined;
    if (codeStep) {
      const tests = step === "transfer" ? q.variant!.tests : q.tests!;
      const results = tests.map((t, i) => ({ testId: t.id, passed: passed || i > 0, timedOut: false }));
      const firstFailure = passed ? undefined : { testId: tests[0]!.id, passed: false, timedOut: false, error: "expected 3, got 4" };
      return {
        step, passed,
        ...(feedback !== undefined ? { feedback } : {}),
        run: { passed, results: firstFailure ? [firstFailure, ...results.slice(1)] : results, runtimeMs: 42, ...(firstFailure ? { firstFailure } : {}) },
      };
    }
    return {
      step, passed,
      ...(feedback !== undefined ? { feedback } : {}),
      rubric: (q.rubrics[step] ?? []).map((p) => ({
        pointId: p.id, spans: passed ? ["quoted words"] : [], quoteMatched: passed, verifierYes: passed, met: passed,
      })),
    };
  };
  return { grade, calls };
}

describe("code question (Apply) through an injected grader", () => {
  it("grade -> Attempt -> gap -> readiness -> next task, with one grader call", async () => {
    const { grade, calls } = recordingGrader(() => false);
    const h = await setup({}, { gradeStep: grade });
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe", "apply");

    const r = await h.session.submitStep(ladder.id, "def shortest_path(): ...", 90_000);

    expect(calls).toHaveLength(1); // tests are not executed a second time by the engine
    expect(calls[0]).toMatchObject({ step: "apply", hadLang: true, answer: "def shortest_path(): ..." });

    // SubmitResult has every contract field
    expect(r.grade.run).toMatchObject({ passed: false, runtimeMs: 42 });
    expect(r.ladder.current).toBe("explain");
    expect(r.nextQuestionText).toBeTruthy();
    expect(r.gapsChanged).toHaveLength(1);
    expect(r.cellsChanged).toHaveLength(1);
    // revealedApproach only applies to the hint step (API Contract §3.1);
    // an Apply-step SubmitResult correctly omits the key entirely rather
    // than including it set to undefined (exactOptionalPropertyTypes).
    expect(r.revealedApproach).toBeUndefined();

    // Attempt keeps the grader's evidence untouched
    const [attempt] = await h.repo.getAttempts(h.student.id);
    expect(attempt).toMatchObject({ step: "apply", timeMs: 90_000, assisted: false, ladderId: ladder.id });
    expect(attempt!.grade).toEqual(r.grade);

    // gap and readiness follow the grade
    expect(r.gapsChanged[0]).toMatchObject({ type: "coding", status: "suspected", attemptIds: [attempt!.id] });
    const map = await h.readiness.getReadinessMap(h.student.id);
    expect(map.technical[0]!.cells.apply).toMatchObject({ state: "amber", attemptIds: [attempt!.id] });

    // planner reacts
    expect(await h.planner.getNextTask(h.student.id)).toMatchObject({ kind: "confirm", gapId: r.gapsChanged[0]!.id });
  });
});

describe("open-ended question (Explain, then Transfer) through an injected grader", () => {
  it("works for a question with no programming language and never sends run data", async () => {
    const { grade, calls } = recordingGrader((c) => c.step !== "transfer");
    const h = await setup({}, { gradeStep: grade });
    const { ladder, question } = await h.session.startLadder(h.student.id, "tp_project", "probe", "explain");
    expect(question.lang).toBeUndefined();

    const explain = await h.session.submitStep(ladder.id, "I chose X over Y because Z", 60_000);
    expect(explain.ladder.current).toBe("transfer");
    expect(explain.grade.rubric!.every((p) => p.met)).toBe(true);
    expect(explain.grade.run).toBeUndefined();
    expect(explain.gapsChanged).toEqual([]);

    const transfer = await h.session.submitStep(ladder.id, "I would shard the database", 60_000);
    expect(transfer.ladder.current).toBe("done");
    expect(transfer.grade.rubric!.some((p) => !p.met)).toBe(true);
    expect(transfer.gapsChanged[0]).toMatchObject({ type: "adapting", step: "transfer", status: "suspected" });

    expect(calls.map((c) => [c.step, c.hadLang])).toEqual([["explain", false], ["transfer", false]]);

    const attempts = await h.repo.getAttempts(h.student.id);
    expect(attempts.map((a) => a.step)).toEqual(["explain", "transfer"]);
    expect(attempts[1]!.grade.rubric).toBeDefined();

    const project = (await h.readiness.getReadinessMap(h.student.id)).technical.find((x) => x.topic.id === "tp_project")!;
    expect(project.cells.explain.state).toBe("green");
    expect(project.cells.transfer.state).toBe("amber");

    const ev = await h.readiness.getCellEvidence(h.student.id, "tp_project", "transfer");
    expect(ev.attempts[0]!.grade.rubric!.length).toBeGreaterThan(0);

    expect(await h.planner.getNextTask(h.student.id)).toMatchObject({ kind: "confirm", topicId: "tp_project" });
  });
});

describe("assisted pass and fresh re-test through an injected grader", () => {
  it("an assisted Apply pass stays amber; only a fresh independent re-test makes it green", async () => {
    const { grade } = recordingGrader((c) => !(c.step === "recognize" || c.step === "hint"));
    const h = await setup({}, { gradeStep: grade });
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe");
    await h.session.submitStep(ladder.id, "a", 1); // recognize fails
    const hint = await h.session.submitStep(ladder.id, "b", 1); // hint fails too: approach revealed
    expect(hint.ladder.assisted).toBe(true);
    const apply = await h.session.submitStep(ladder.id, "c", 1); // apply passes while assisted
    expect(apply.ladder.outcomes.apply!.assisted).toBe(true);
    let map = await h.readiness.getReadinessMap(h.student.id);
    expect(map.technical[0]!.cells.apply.state).toBe("amber");

    const fresh = await h.session.startLadder(h.student.id, "tp_graphs", "retest", "apply");
    await h.session.submitStep(fresh.ladder.id, "d", 1);
    map = await h.readiness.getReadinessMap(h.student.id);
    expect(map.technical[0]!.cells.apply.state).toBe("green");
  });
});
