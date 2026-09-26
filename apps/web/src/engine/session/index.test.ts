import { describe, expect, it, vi } from "vitest";
import type { GradeResult } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";
import { errorCodeOf } from "../errors";
import { fakeGrade, NOW, runLadder, setup } from "../testUtils";

const PASS = "PASS";
const FAIL = "wrong";

describe("createStudent", () => {
  it("creates a student and an initial plan (Setup -> Plan)", async () => {
    const h = await setup();
    expect(h.student).toMatchObject({ id: "st_1", companyId: "co_zoho", hoursPerDay: 3 });
    const plan = await h.planner.getPlan(h.student.id);
    expect(plan.days.length).toBeGreaterThan(0);
  });

  it.each([
    [{ name: "  " }, "INVALID_STEP"],
    [{ hoursPerDay: 0 }, "INVALID_STEP"],
    [{ hoursPerDay: 25 }, "INVALID_STEP"],
    [{ driveDate: "03/10/2026" }, "INVALID_STEP"],
    [{ driveDate: "2026-02-31" }, "INVALID_STEP"],
    [{ driveDate: "2026-09-25" }, "INVALID_STEP"],
    [{ companyId: "co_nope" }, "NOT_FOUND"],
  ])("rejects bad input %j", async (bad, code) => {
    await expect(setup(bad)).rejects.toMatchObject({ code });
  });
});

describe("startLadder", () => {
  it("creates a ladder on the first step with the first question", async () => {
    const h = await setup();
    const { ladder, question } = await h.session.startLadder(h.student.id, "tp_graphs", "probe");
    expect(ladder).toMatchObject({
      id: "ld_1",
      studentId: h.student.id,
      questionId: "q_bfs_probe",
      track: "technical",
      current: "recognize",
      assisted: false,
      outcomes: {},
    });
    expect(question.id).toBe("q_bfs_probe");
    expect(question.tests!.filter((t) => t.hidden).every((t) => t.input === "" && t.expected === "")).toBe(true);
  });

  it("starts an HR topic on the HR ladder", async () => {
    const h = await setup();
    const { ladder } = await h.session.startLadder(h.student.id, "tp_hr_communication", "probe");
    expect(ladder).toMatchObject({ track: "hr", current: "structure" });
  });

  it("can start at a chosen step (a re-test of the failed step)", async () => {
    const h = await setup();
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe", "apply");
    expect(ladder.current).toBe("apply");
  });

  it("serves each role, and the confirm/re-test question is different from the probe", async () => {
    const h = await setup();
    const ids = new Set<string>();
    for (const role of ["probe", "confirm", "retest"] as const) {
      const r = await runLadder(h, "tp_graphs", role, [`${PASS}`]);
      ids.add(r.question.id);
      expect(r.question.role).toBe(role);
    }
    expect(ids.size).toBe(3);
  });

  it("rejects an unknown student, topic, role, or an invalid step", async () => {
    const h = await setup();
    await expect(h.session.startLadder("st_nope", "tp_graphs", "probe")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(h.session.startLadder(h.student.id, "tp_nope", "probe")).rejects.toMatchObject({ code: "NOT_FOUND" });
    // @ts-expect-error deliberately invalid role
    await expect(h.session.startLadder(h.student.id, "tp_graphs", "bogus")).rejects.toMatchObject({ code: "INVALID_STEP" });
    await expect(h.session.startLadder(h.student.id, "tp_graphs", "probe", "structure")).rejects.toMatchObject({
      code: "INVALID_STEP",
    });
  });

  it("reports a topic with no questions as NOT_FOUND", async () => {
    const h = await setup({ scope: "two-week" });
    await expect(h.session.startLadder(h.student.id, "tp_trees", "probe")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("submitStep orchestration (API Contract 3.3)", () => {
  it("grade -> attempt -> next step -> gaps -> readiness -> replan -> SubmitResult", async () => {
    const gradeSpy = vi.fn(fakeGrade);
    const h2 = await setup({}, { gradeStep: gradeSpy });
    const { ladder, question } = await h2.session.startLadder(h2.student.id, "tp_graphs", "probe", "apply");

    const result = await h2.session.submitStep(ladder.id, FAIL, 120_000);

    // grade: grading was called with the FULL question (hidden tests included), the step, and the answer
    expect(gradeSpy).toHaveBeenCalledTimes(1);
    expect(gradeSpy.mock.calls[0]![0].tests!.some((t) => t.hidden && t.expected !== "")).toBe(true);
    expect(gradeSpy.mock.calls[0]!.slice(1)).toEqual(["apply", FAIL]);
    expect(result.grade).toMatchObject({ step: "apply", passed: false });
    expect(result.grade.run!.firstFailure).toBeDefined();

    // attempt saved, with the student's answer, grade, timing and assisted flag
    const attempts = await h2.repo.getAttempts(h2.student.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      id: "att_1",
      studentId: h2.student.id,
      questionId: question.id,
      ladderId: ladder.id,
      step: "apply",
      answer: FAIL,
      timeMs: 120_000,
      assisted: false,
    });
    expect(attempts[0]!.grade.passed).toBe(false);

    // next step: apply fail -> explain
    expect(result.ladder.current).toBe("explain");
    expect(result.ladder.outcomes.apply).toEqual({ passed: false, assisted: false, timeMs: 120_000, attemptId: "att_1" });
    expect(result.nextQuestionText).toBe(question.followUp);
    expect(result.revealedApproach).toBeUndefined();
    expect((await h2.repo.getLadder(ladder.id))!.current).toBe("explain");

    // gaps: first failure -> suspected coding gap, persisted
    expect(result.gapsChanged).toHaveLength(1);
    expect(result.gapsChanged[0]).toMatchObject({ topicId: "tp_graphs", step: "apply", type: "coding", status: "suspected" });
    expect(await h2.repo.getGaps(h2.student.id)).toHaveLength(1);

    // readiness: the apply cell moved to amber
    expect(result.cellsChanged).toEqual([{ topicId: "tp_graphs", step: "apply", state: "amber", attemptIds: ["att_1"] }]);
    const map = await h2.readiness.getReadinessMap(h2.student.id);
    expect(map.technical.find((r) => r.topic.id === "tp_graphs")!.cells.apply.state).toBe("amber");

    // replan: a confirmation probe for the suspected gap is now scheduled
    const next = await h2.planner.getNextTask(h2.student.id);
    expect(next).toMatchObject({ kind: "confirm", topicId: "tp_graphs", gapId: result.gapsChanged[0]!.id });
  });

  it("walks the whole technical ladder: recognize pass -> apply -> explain -> transfer -> done", async () => {
    const h = await setup();
    const { results } = await runLadder(h, "tp_graphs", "probe", [PASS, PASS, PASS, PASS]);
    expect(results.map((r) => r.ladder.current)).toEqual(["apply", "explain", "transfer", "done"]);
    expect(results[0]!.nextQuestionText).toContain("fewest edges");
    expect(results[2]!.nextQuestionText).toContain("Twist");
    expect(results[3]!.nextQuestionText).toBeUndefined();
    expect(results.every((r) => r.gapsChanged.length === 0)).toBe(true);
    const map = await h.readiness.getReadinessMap(h.student.id);
    const graphs = map.technical.find((r) => r.topic.id === "tp_graphs")!;
    expect(Object.values(graphs.cells).map((c) => c.state)).toEqual(["green", "green", "green", "green"]);
  });

  it("recognize fail -> hint (the hint text is the next prompt) and no gap yet", async () => {
    const h = await setup();
    const { results, question } = await runLadder(h, "tp_graphs", "probe", [FAIL]);
    expect(results[0]!.ladder.current).toBe("hint");
    expect(results[0]!.nextQuestionText).toBe(question.hint);
    expect(results[0]!.gapsChanged).toEqual([]);
    expect(results[0]!.cellsChanged[0]).toMatchObject({ step: "recognize", state: "amber" });
  });

  it("hint fail reveals the approach, marks the ladder assisted, and records a concept gap", async () => {
    const h = await setup();
    const { results } = await runLadder(h, "tp_graphs", "probe", [FAIL, FAIL]);
    const r = results[1]!;
    expect(r.revealedApproach).toContain("BFS");
    expect(r.ladder).toMatchObject({ current: "apply", assisted: true });
    expect(r.gapsChanged[0]).toMatchObject({ type: "concept", step: "recognize", status: "suspected" });
  });

  it("hint pass records a recall gap and the following Apply is NOT assisted", async () => {
    const h = await setup();
    const { results } = await runLadder(h, "tp_graphs", "probe", [FAIL, PASS, PASS]);
    expect(results[1]!.gapsChanged[0]).toMatchObject({ type: "recall", status: "suspected" });
    expect(results[1]!.ladder.assisted).toBe(false);
    const attempts = await h.repo.getAttempts(h.student.id);
    expect(attempts.map((a) => [a.step, a.assisted])).toEqual([
      ["recognize", false],
      ["hint", true],
      ["apply", false],
    ]);
  });

  it("an assisted pass is stored as assisted, never turns the cell green, and never fixes a gap", async () => {
    const h = await setup();
    // First a suspected coding gap on Apply.
    await runLadder(h, "tp_graphs", "probe", [PASS, FAIL]);
    // Then a ladder where the approach is revealed, and Apply passes while assisted.
    const { results } = await runLadder(h, "tp_graphs", "confirm", [FAIL, FAIL, PASS]);
    const apply = results[2]!;
    expect((await h.repo.getAttempts(h.student.id)).at(-1)).toMatchObject({ step: "apply", assisted: true });
    expect(apply.ladder.outcomes.apply!.assisted).toBe(true);
    const gaps = await h.repo.getGaps(h.student.id);
    expect(gaps.find((g) => g.step === "apply")!.status).toBe("suspected");
    const map = await h.readiness.getReadinessMap(h.student.id);
    expect(map.technical[0]!.cells.apply.state).toBe("amber");
  });

  it("keeps every attempt (history is never lost)", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", [PASS, FAIL, PASS, FAIL]);
    await runLadder(h, "tp_graphs", "confirm", [PASS, FAIL]);
    const attempts = await h.repo.getAttempts(h.student.id);
    expect(attempts.map((a) => a.id)).toEqual(["att_1", "att_2", "att_3", "att_4", "att_5", "att_6"]);
    expect(await h.repo.getAttempts(h.student.id, "tp_sql_joins")).toEqual([]);
    expect(await h.repo.getAttempts(h.student.id, "tp_graphs")).toHaveLength(6);
  });

  it("a slow correct answer raises a Speed gap", async () => {
    const h = await setup();
    const { results } = await runLadder(h, "tp_graphs", "probe", [PASS], "apply", 300_000 * 1.5 + 1);
    expect(results[0]!.gapsChanged[0]).toMatchObject({ type: "speed", status: "suspected", step: "apply" });
    expect(results[0]!.cellsChanged[0]).toMatchObject({ step: "apply", state: "amber" });
  });
});

describe("submitStep errors", () => {
  it("unknown ladder -> NOT_FOUND", async () => {
    const h = await setup();
    await expect(h.session.submitStep("ld_nope", PASS, 1)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("submitting after the ladder is complete -> INVALID_STEP, and nothing is saved", async () => {
    const h = await setup();
    const { ladder } = await runLadder(h, "tp_graphs", "probe", [PASS, PASS, PASS, PASS]);
    const before = (await h.repo.getAttempts(h.student.id)).length;
    await expect(h.session.submitStep(ladder.id, PASS, 1)).rejects.toMatchObject({ code: "INVALID_STEP" });
    expect((await h.repo.getAttempts(h.student.id)).length).toBe(before);
  });

  it("bad answer / time -> INVALID_STEP", async () => {
    const h = await setup();
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe");
    // @ts-expect-error deliberately invalid answer
    await expect(h.session.submitStep(ladder.id, undefined, 1)).rejects.toMatchObject({ code: "INVALID_STEP" });
    await expect(h.session.submitStep(ladder.id, PASS, -5)).rejects.toMatchObject({ code: "INVALID_STEP" });
    await expect(h.session.submitStep(ladder.id, PASS, Number.NaN)).rejects.toMatchObject({ code: "INVALID_STEP" });
  });

  it("a grading failure surfaces its error and leaves the ladder and attempts untouched so the student can retry", async () => {
    const failing = vi.fn().mockRejectedValueOnce(new NotImplementedError("gradeStep", "Suchit", "M1"));
    failing.mockImplementation(fakeGrade);
    const h = await setup({}, { gradeStep: failing });
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe");
    let caught: unknown;
    try {
      await h.session.submitStep(ladder.id, PASS, 1);
    } catch (e) {
      caught = e;
    }
    expect(errorCodeOf(caught, "GEMINI_FAILED")).toBe("RUNNER_NOT_READY");
    expect(await h.repo.getAttempts(h.student.id)).toEqual([]);
    expect((await h.repo.getLadder(ladder.id))!.current).toBe("recognize");
    const retry = await h.session.submitStep(ladder.id, PASS, 1);
    expect(retry.ladder.current).toBe("apply");
  });

  it("grading that answers a different step is a CONTRACT_MISMATCH", async () => {
    const wrong = async (): Promise<GradeResult> => ({ step: "explain", passed: true });
    const h = await setup({}, { gradeStep: wrong });
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe");
    await expect(h.session.submitStep(ladder.id, PASS, 1)).rejects.toMatchObject({ code: "CONTRACT_MISMATCH" });
  });

  it("a second submit while the first is still being graded is rejected", async () => {
    let release!: () => void;
    const slow = (q: Parameters<typeof fakeGrade>[0], s: Parameters<typeof fakeGrade>[1], a: string) =>
      new Promise<GradeResult>((resolve) => {
        release = () => resolve({ step: s, passed: true });
        void q;
        void a;
      });
    const h = await setup({}, { gradeStep: slow });
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe");
    const first = h.session.submitStep(ladder.id, PASS, 1);
    await new Promise((r) => setTimeout(r, 0));
    await expect(h.session.submitStep(ladder.id, PASS, 1)).rejects.toMatchObject({ code: "INVALID_STEP" });
    release();
    await first;
    expect((await h.repo.getAttempts(h.student.id)).length).toBe(1);
  });
});

describe("HR ladder", () => {
  it("runs structure -> specifics -> followup with an HR gap per failed step", async () => {
    const h = await setup();
    const { results } = await runLadder(h, "tp_hr_communication", "probe", [FAIL, FAIL, PASS]);
    expect(results.map((r) => r.ladder.current)).toEqual(["specifics", "followup", "done"]);
    expect(results[0]!.gapsChanged[0]).toMatchObject({ type: "structure", step: "structure" });
    expect(results[1]!.gapsChanged[0]).toMatchObject({ type: "vague", step: "specifics" });
    expect(results[2]!.gapsChanged).toEqual([]);
    const map = await h.readiness.getReadinessMap(h.student.id);
    expect(Object.values(map.hr[0]!.cells).map((c) => c.state)).toEqual(["amber", "amber", "green"]);
  });
});

describe("the PRD demo path (BFS -> amber -> red -> drill -> re-test -> green)", () => {
  it("runs end to end on the engine with scripted grading", async () => {
    const h = await setup();
    const graphs = () => h.readiness.getReadinessMap(h.student.id).then((m) => m.technical.find((r) => r.topic.id === "tp_graphs")!);

    // Day 1: the first task is the highest-weight untested topic.
    const first = await h.planner.getNextTask(h.student.id);
    expect(first).toMatchObject({ kind: "probe", topicId: "tp_graphs" });

    // Probe: recognize passes, the BFS coding step fails -> Coding gap, amber.
    const probe = await runLadder(h, "tp_graphs", "probe", [PASS, FAIL, PASS, PASS]);
    expect(probe.results[1]!.gapsChanged[0]).toMatchObject({ type: "coding", status: "suspected" });
    expect((await graphs()).cells.apply.state).toBe("amber");
    const gapId = probe.results[1]!.gapsChanged[0]!.id;

    // The plan now asks for a confirmation probe on that gap.
    expect(await h.planner.getNextTask(h.student.id)).toMatchObject({ kind: "confirm", gapId });

    // Confirmation probe on a second graph question: fails again -> confirmed, red.
    const confirm = await runLadder(h, "tp_graphs", "confirm", [FAIL], "apply");
    expect(confirm.question.id).not.toBe(probe.question.id);
    expect(confirm.results[0]!.gapsChanged[0]).toMatchObject({ id: gapId, status: "confirmed" });
    expect((await graphs()).cells.apply.state).toBe("red");

    // The red cell explains itself: both failed attempts, with their questions.
    const evidence = await h.readiness.getCellEvidence(h.student.id, "tp_graphs", "apply");
    expect(evidence.cell.state).toBe("red");
    expect(evidence.attempts.map((a) => a.question.id)).toEqual([probe.question.id, confirm.question.id]);
    expect(evidence.attempts.every((a) => !a.grade.passed && a.grade.run?.firstFailure)).toBe(true);

    // Plan: debug drill, then a re-test.
    const drillTask = await h.planner.getNextTask(h.student.id);
    expect(drillTask).toMatchObject({ kind: "drill", gapId, gapType: "coding" });
    const drill = await h.drills.getDrill(gapId);
    expect(drill).toMatchObject({ kind: "debug", gapType: "coding", questionIds: ["q_bfs_debug_drill"] });

    // Finishing the drill does NOT fix the gap.
    await h.planner.completePlanItem(drillTask.id, "done");
    expect((await h.repo.getGap(gapId))!.status).toBe("confirmed");
    expect((await graphs()).cells.apply.state).toBe("red");
    const retestTask = await h.planner.getNextTask(h.student.id);
    expect(retestTask).toMatchObject({ kind: "retest", gapId, step: "apply" });

    // Fresh re-test: a new question, and it passes -> fixed, green.
    const retest = await runLadder(h, "tp_graphs", "retest", [PASS], "apply");
    expect([probe.question.id, confirm.question.id]).not.toContain(retest.question.id);
    expect(retest.results[0]!.gapsChanged[0]).toMatchObject({ id: gapId, status: "fixed" });
    expect(retest.results[0]!.cellsChanged[0]).toMatchObject({ step: "apply", state: "green" });
    expect((await graphs()).cells.apply.state).toBe("green");

    // Plan moves on: no more graphs drills or re-tests, next is another topic.
    const after = await h.planner.getNextTask(h.student.id);
    expect(after.kind).toBe("probe");
    expect(after.topicId).toBe("tp_sql_joins");
    const plan = await h.planner.getPlan(h.student.id);
    const todo = plan.days.flatMap((d) => d.items).filter((i) => i.status === "todo");
    expect(todo.some((i) => i.gapId === gapId)).toBe(false);
  });

  it("a failed re-test keeps the gap confirmed and schedules another drill and a new re-test", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", [PASS, FAIL]);
    const confirm = await runLadder(h, "tp_graphs", "confirm", [FAIL], "apply");
    const gapId = confirm.results[0]!.gapsChanged[0]!.id;
    const drillTask = await h.planner.getNextTask(h.student.id);
    await h.planner.completePlanItem(drillTask.id, "done");

    const retest = await runLadder(h, "tp_graphs", "retest", [FAIL], "apply");
    expect(retest.results[0]!.gapsChanged[0]).toMatchObject({ id: gapId, status: "confirmed" });

    const next = await h.planner.getNextTask(h.student.id);
    expect(next).toMatchObject({ kind: "drill", gapId });
    expect(next.id).not.toBe(drillTask.id);
  });

  it("a pass on a question the student already failed does not fix the gap", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", [PASS, FAIL]);
    const { results } = await runLadder(h, "tp_graphs", "confirm", [FAIL], "apply");
    const gapId = results[0]!.gapsChanged[0]!.id;
    // Exhaust the bank so the next ladder must repeat a question.
    await runLadder(h, "tp_graphs", "retest", [FAIL], "apply");
    await runLadder(h, "tp_graphs", "retest", [FAIL], "apply");
    const repeat = await runLadder(h, "tp_graphs", "retest", [PASS], "apply");
    expect(repeat.results[0]!.gapsChanged).toEqual([]);
    expect((await h.repo.getGap(gapId))!.status).toBe("confirmed");
  });

  it("uses the injected clock for timestamps", async () => {
    const h = await setup();
    const { ladder } = await h.session.startLadder(h.student.id, "tp_graphs", "probe");
    expect(ladder.startedAt).toBe(NOW().toISOString());
  });
});
