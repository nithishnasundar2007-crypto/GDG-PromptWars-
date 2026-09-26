// Verification pass. The transition matrix below is typed out literally from
// docs/DATA_MODEL.md (the repo's transcription of PRD 3.1) rather than read
// from TECHNICAL_TRANSITIONS, so a wrong table cannot pass by agreeing with itself.
import { describe, expect, it } from "vitest";
import type { AnyStep, GradeResult, LadderState } from "../contracts";
import { topicsMissingQuestions } from "./content";
import { nextStep } from "./ladder";
import { NOW, runLadder, setup } from "./testUtils";

const ladder = (track: "technical" | "hr", assisted = false): LadderState => ({
  id: "ld", studentId: "s", questionId: "q", track, current: "recognize", assisted, outcomes: {}, startedAt: "t",
});
const g = (step: AnyStep, passed: boolean): GradeResult => ({ step, passed });

// [step, outcome, next, gap, assistedAfter]
const TECH: [AnyStep, "pass" | "fail", string, string | undefined, boolean][] = [
  ["recognize", "pass", "apply", undefined, false],
  ["recognize", "fail", "hint", undefined, false],
  ["hint", "pass", "apply", "recall", false],
  ["hint", "fail", "apply", "concept", true],
  ["apply", "pass", "explain", undefined, false],
  ["apply", "fail", "explain", "coding", false],
  ["explain", "pass", "transfer", undefined, false],
  ["explain", "fail", "done", "explaining", false],
  ["transfer", "pass", "done", undefined, false],
  ["transfer", "fail", "done", "adapting", false],
];
const HR: [AnyStep, "pass" | "fail", string, string | undefined][] = [
  ["structure", "pass", "specifics", undefined],
  ["structure", "fail", "specifics", "structure"],
  ["specifics", "pass", "followup", undefined],
  ["specifics", "fail", "followup", "vague"],
  ["followup", "pass", "done", undefined],
  ["followup", "fail", "done", "followup"],
];

describe("ladder rows, typed from docs/DATA_MODEL.md", () => {
  it.each(TECH)("technical %s %s -> %s, gap %s, assisted %s", (step, outcome, next, gap, assisted) => {
    const r = nextStep(ladder("technical"), g(step, outcome === "pass"));
    expect([r.next, r.gap, r.assisted]).toEqual([next, gap, assisted]);
  });
  it.each(HR)("hr %s %s -> %s, gap %s", (step, outcome, next, gap) => {
    const r = nextStep(ladder("hr"), g(step, outcome === "pass"));
    expect([r.next, r.gap]).toEqual([next, gap]);
  });
});

describe("open-ended vs code questions both flow through gradeStep", () => {
  it("a question with no language is graded on every step by rubric, and the engine runs no code itself", async () => {
    const h = await setup();
    const { question, results } = await runLadder(h, "tp_project", "probe", ["PASS", "PASS", "PASS", "PASS"]);
    expect(question.lang).toBeUndefined();
    expect(results.map((r) => r.ladder.current)).toEqual(["apply", "explain", "transfer", "done"]);
    expect(results.every((r) => r.grade.run === undefined && (r.grade.rubric?.length ?? 0) > 0)).toBe(true);
  });

  it("a code question carries the RunResult from grading through to the attempt", async () => {
    const h = await setup();
    const { results } = await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    expect(results[0]!.grade.run?.firstFailure).toBeDefined();
    expect((await h.repo.getAttempts(h.student.id))[0]!.grade.run).toBeDefined();
  });

  it("the engine does not implement grading or code execution", () => {
    const sources = import.meta.glob<string>("./**/*.ts", { query: "?raw", import: "default", eager: true });
    const files = Object.entries(sources).filter(([f]) => !f.endsWith(".test.ts") && !f.includes("testUtils"));
    expect(files.length).toBeGreaterThan(5);
    for (const [f, src] of files) {
      expect(src, f).not.toMatch(/function +(runCode|gradeStep|explain|matchQuote|runEval)[( <]/);
    }
  });
});

describe("speed threshold is configurable", () => {
  it("a stricter factor flags a pass the default would accept", async () => {
    const strict = await setup({}, { slowFactor: 1.1 });
    const a = await runLadder(strict, "tp_graphs", "probe", ["PASS"], "apply", 300_000 * 1.2);
    expect(a.results[0]!.gapsChanged[0]).toMatchObject({ type: "speed" });
    const dflt = await setup();
    const b = await runLadder(dflt, "tp_graphs", "probe", ["PASS"], "apply", 300_000 * 1.2);
    expect(b.results[0]!.gapsChanged).toEqual([]);
  });
});

describe("cell evidence explains every non-grey state from ladder attempts", () => {
  it("amber, red and green cells each return attempts whose grading supports the state", async () => {
    const h = await setup();
    const evidence = () => h.readiness.getCellEvidence(h.student.id, "tp_graphs", "apply");

    await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    let ev = await evidence();
    expect(ev.cell.state).toBe("amber");
    expect(ev.attempts.every((a) => !a.grade.passed && a.grade.run?.firstFailure && a.answer && a.question.id)).toBeTruthy();

    await runLadder(h, "tp_graphs", "confirm", ["wrong"], "apply");
    ev = await evidence();
    expect(ev.cell.state).toBe("red");
    expect(ev.attempts).toHaveLength(2);
    expect(ev.attempts.every((a) => !a.grade.passed && a.grade.feedback)).toBe(true);

    await runLadder(h, "tp_graphs", "retest", ["PASS"], "apply");
    ev = await evidence();
    expect(ev.cell.state).toBe("green");
    expect(ev.attempts.at(-1)).toMatchObject({ assisted: false, grade: { passed: true } });
  });

  it("an open-ended cell returns rubric evidence", async () => {
    const h = await setup();
    await runLadder(h, "tp_sql_joins", "probe", ["wrong"]);
    const ev = await h.readiness.getCellEvidence(h.student.id, "tp_sql_joins", "recognize");
    expect(ev.attempts[0]!.grade.rubric!.length).toBeGreaterThan(0);
  });

  it("KNOWN LIMIT: a gap created by a debrief has no attempts, so its cell has no evidence to show", async () => {
    const h = await setup({ scope: "two-week" });
    await h.debrief.saveDebrief({
      companyId: "co_zoho", roundName: "Coding", date: "2026-09-26", studentId: h.student.id,
      items: [{ question: "Explain BFS on a graph", answer: "I could not" }],
    });
    const ev = await h.readiness.getCellEvidence(h.student.id, "tp_graphs", "recognize");
    expect(ev.cell.state).toBe("amber");
    expect(ev.attempts).toEqual([]);
  });
});

describe("planner scenarios", () => {
  const gap = (topicId: string, status: "suspected" | "confirmed") => ({
    id: `gap_st_1_${topicId}_apply_coding`, studentId: "st_1", topicId, step: "apply" as const,
    type: "coding" as const, status, attemptIds: ["a"], updatedAt: "t",
  });
  const todo = async (h: Awaited<ReturnType<typeof setup>>) =>
    (await h.planner.getPlan(h.student.id)).days.flatMap((d) => d.items).filter((i) => i.status === "todo");

  it("A: confirmed low-weight vs confirmed high-weight -> higher weight first", async () => {
    const h = await setup();
    await h.repo.upsertGap(gap("tp_project", "confirmed"));
    await h.repo.upsertGap(gap("tp_graphs", "confirmed"));
    expect((await todo(h))[0]).toMatchObject({ kind: "drill", topicId: "tp_graphs" });
  });

  it("C: a suspected low-weight gap is scheduled before an untested high-weight topic", async () => {
    const h = await setup();
    await h.repo.upsertGap(gap("tp_project", "suspected"));
    const items = await todo(h);
    expect(items[0]).toMatchObject({ kind: "confirm", topicId: "tp_project" });
    expect(items[1]).toMatchObject({ kind: "probe", topicId: "tp_graphs" });
  });

  it("D: fixing the gap removes its drill and re-test", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    await runLadder(h, "tp_graphs", "confirm", ["wrong"], "apply");
    await runLadder(h, "tp_graphs", "retest", ["PASS"], "apply");
    expect((await todo(h)).some((i) => i.topicId === "tp_graphs")).toBe(false);
  });
});

describe("debrief", () => {
  it("keeps company and round, matches topics only within the named round, and updates the plan", async () => {
    const h = await setup({ scope: "two-week" });
    const { debrief, gaps } = await h.debrief.saveDebrief({
      companyId: "co_zoho", roundName: "HR", date: "2026-09-26", studentId: h.student.id,
      items: [
        { question: "Explain BFS on a graph", answer: "I could not" },
        { question: "Tell me about a conflict with a teammate", answer: "I froze" },
      ],
    });
    expect(debrief).toMatchObject({ companyId: "co_zoho", roundName: "HR" });
    expect(debrief.items.map((i) => i.question)).toHaveLength(2);
    expect(gaps.map((x) => x.topicId)).toEqual(["tp_hr_communication"]); // the graph question is outside the HR round
    expect((await h.planner.getNextTask(h.student.id)).topicId).toBe("tp_hr_communication");
  });
});

describe("two-week seed coverage is reported, not hidden", () => {
  it("lists exactly the topics still without questions", () => {
    expect(topicsMissingQuestions("two-week").map((t) => t.id).sort()).toEqual([
      "tp_arrays_strings", "tp_dp", "tp_normalization", "tp_oop", "tp_os_deadlocks", "tp_os_processes", "tp_transactions", "tp_trees",
    ]);
    expect(topicsMissingQuestions("sprint")).toEqual([]);
    void NOW;
  });
});
