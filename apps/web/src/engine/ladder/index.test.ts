import { describe, expect, it } from "vitest";
import type { GradeResult, LadderState } from "../../contracts";
import {
  HR_TRANSITIONS,
  TECHNICAL_TRANSITIONS,
  applyStepResult,
  attemptWasAssisted,
  columnOf,
  firstStepFor,
  newLadder,
  nextStep,
  promptForStep,
  stepsFor,
} from "./index";
import { getQuestion } from "../content";

function ladder(overrides: Partial<LadderState> = {}): LadderState {
  return {
    id: "ld_test",
    studentId: "st_test",
    questionId: "q_test",
    track: "technical",
    current: "recognize",
    assisted: false,
    outcomes: {},
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

function grade(step: GradeResult["step"], passed: boolean): GradeResult {
  return { step, passed };
}

describe("technical track transitions (PRD 3.1)", () => {
  it("recognize pass -> skips to apply, no gap yet", () => {
    const r = nextStep(ladder(), grade("recognize", true));
    expect(r.next).toBe("apply");
    expect(r.gap).toBeUndefined();
    expect(r.assisted).toBe(false);
  });

  it("recognize fail -> goes to hint, no gap yet (deferred)", () => {
    const r = nextStep(ladder(), grade("recognize", false));
    expect(r.next).toBe("hint");
    expect(r.gap).toBeUndefined();
  });

  it("hint pass -> goes to apply, records a recall gap", () => {
    const r = nextStep(ladder(), grade("hint", true));
    expect(r.next).toBe("apply");
    expect(r.gap).toBe("recall");
  });

  it("hint fail -> goes to apply, records a concept gap, marks assisted", () => {
    const r = nextStep(ladder(), grade("hint", false));
    expect(r.next).toBe("apply");
    expect(r.gap).toBe("concept");
    expect(r.assisted).toBe(true);
  });

  it("apply pass -> goes to explain", () => {
    const r = nextStep(ladder(), grade("apply", true));
    expect(r.next).toBe("explain");
    expect(r.gap).toBeUndefined();
  });

  it("apply fail -> goes to explain (never hides a later gap), records coding gap", () => {
    const r = nextStep(ladder(), grade("apply", false));
    expect(r.next).toBe("explain");
    expect(r.gap).toBe("coding");
  });

  it("explain pass -> goes to transfer", () => {
    const r = nextStep(ladder(), grade("explain", true));
    expect(r.next).toBe("transfer");
  });

  it("explain fail -> ladder ends, records explaining gap", () => {
    const r = nextStep(ladder(), grade("explain", false));
    expect(r.next).toBe("done");
    expect(r.gap).toBe("explaining");
  });

  it("transfer pass -> ladder ends, no gap", () => {
    const r = nextStep(ladder(), grade("transfer", true));
    expect(r.next).toBe("done");
    expect(r.gap).toBeUndefined();
  });

  it("transfer fail -> ladder ends, records adapting gap", () => {
    const r = nextStep(ladder(), grade("transfer", false));
    expect(r.next).toBe("done");
    expect(r.gap).toBe("adapting");
  });

  it("assisted stays true once set, even on a later pass", () => {
    const assistedLadder = ladder({ assisted: true });
    const r = nextStep(assistedLadder, grade("apply", true));
    expect(r.assisted).toBe(true);
  });
});

describe("HR track transitions (PRD 3.1)", () => {
  it("structure fail -> specifics, records structure gap", () => {
    const r = nextStep(ladder({ track: "hr", current: "structure" }), grade("structure", false));
    expect(r.next).toBe("specifics");
    expect(r.gap).toBe("structure");
  });

  it("structure pass -> specifics, no gap", () => {
    const r = nextStep(ladder({ track: "hr" }), grade("structure", true));
    expect(r.next).toBe("specifics");
    expect(r.gap).toBeUndefined();
  });

  it("specifics fail -> followup, records vague gap", () => {
    const r = nextStep(ladder({ track: "hr" }), grade("specifics", false));
    expect(r.next).toBe("followup");
    expect(r.gap).toBe("vague");
  });

  it("followup fail -> done, records followup gap", () => {
    const r = nextStep(ladder({ track: "hr" }), grade("followup", false));
    expect(r.next).toBe("done");
    expect(r.gap).toBe("followup");
  });

  it("followup pass -> done, no gap", () => {
    const r = nextStep(ladder({ track: "hr" }), grade("followup", true));
    expect(r.next).toBe("done");
    expect(r.gap).toBeUndefined();
  });
});

describe("transition table coverage (PRD 3.1)", () => {
  it("every technical row is exercised on both pass and fail", () => {
    for (const step of Object.keys(TECHNICAL_TRANSITIONS) as (keyof typeof TECHNICAL_TRANSITIONS)[]) {
      const row = TECHNICAL_TRANSITIONS[step];
      expect(nextStep(ladder(), grade(step, true)).next).toBe(row.onPass);
      expect(nextStep(ladder(), grade(step, false)).next).toBe(row.onFail);
    }
    expect(Object.keys(TECHNICAL_TRANSITIONS)).toEqual(["recognize", "hint", "apply", "explain", "transfer"]);
  });

  it("every HR row is exercised on both pass and fail", () => {
    for (const step of Object.keys(HR_TRANSITIONS) as (keyof typeof HR_TRANSITIONS)[]) {
      const row = HR_TRANSITIONS[step];
      expect(nextStep(ladder({ track: "hr" }), grade(step, true)).next).toBe(row.onPass);
      expect(nextStep(ladder({ track: "hr" }), grade(step, false)).next).toBe(row.onFail);
    }
  });

  it("the only way to reach transfer is an explain pass, and the only way to reach hint is a recognize fail", () => {
    const reachable = new Set<string>();
    for (const [step, row] of Object.entries(TECHNICAL_TRANSITIONS)) {
      if (row.onPass === "transfer") reachable.add(step + ":pass");
      if (row.onFail === "transfer") reachable.add(step + ":fail");
      if (row.onPass === "hint") reachable.add(step + ":pass");
      if (row.onFail === "hint") reachable.add(step + ":fail");
    }
    expect([...reachable].sort()).toEqual(["explain:pass", "recognize:fail"]);
  });
});

describe("ladder construction and bookkeeping", () => {
  it("starts on the first step of the track, or on the requested step", () => {
    expect(firstStepFor("technical")).toBe("recognize");
    expect(firstStepFor("hr")).toBe("structure");
    const base = { id: "ld_1", studentId: "st_1", questionId: "q_x", track: "technical" as const, startedAt: "t" };
    expect(newLadder(base).current).toBe("recognize");
    expect(newLadder({ ...base, startStep: "apply" }).current).toBe("apply");
    expect(newLadder(base)).toMatchObject({ assisted: false, outcomes: {} });
  });

  it("steps per track", () => {
    expect(stepsFor("technical")).toEqual(["recognize", "hint", "apply", "explain", "transfer"]);
    expect(stepsFor("hr")).toEqual(["structure", "specifics", "followup"]);
    expect(columnOf("hint")).toBe("recognize");
    expect(columnOf("apply")).toBe("apply");
  });

  it("a hint pass is recorded as assisted; the approach is revealed only after a hint fail", () => {
    const l = ladder();
    expect(attemptWasAssisted(l, "hint")).toBe(true);
    expect(attemptWasAssisted(l, "apply")).toBe(false);
    const afterFail = applyStepResult(l, { step: "hint", passed: false, timeMs: 5, attemptId: "att_1" }, nextStep(l, grade("hint", false)));
    expect(afterFail.assisted).toBe(true);
    expect(afterFail.current).toBe("apply");
    expect(attemptWasAssisted(afterFail, "apply")).toBe(true);
    const afterPass = applyStepResult(l, { step: "hint", passed: true, timeMs: 5, attemptId: "att_1" }, nextStep(l, grade("hint", true)));
    expect(afterPass.assisted).toBe(false);
  });

  it("applyStepResult records the outcome without mutating the input ladder", () => {
    const l = ladder();
    const next = applyStepResult(l, { step: "recognize", passed: true, timeMs: 1234, attemptId: "att_9" }, nextStep(l, grade("recognize", true)));
    expect(next.current).toBe("apply");
    expect(next.outcomes.recognize).toEqual({ passed: true, assisted: false, timeMs: 1234, attemptId: "att_9" });
    expect(l.outcomes).toEqual({});
    expect(l.current).toBe("recognize");
  });

  it("picks the prompt shown for the step the ladder moves to", () => {
    const q = getQuestion("q_bfs_probe")!;
    expect(promptForStep(q, "hint")).toBe(q.hint);
    expect(promptForStep(q, "explain")).toBe(q.followUp);
    expect(promptForStep(q, "transfer")).toBe(q.variant!.prompt);
    expect(promptForStep(q, "done")).toBeUndefined();
    const hr = getQuestion("q_hr_conflict_probe")!;
    expect(promptForStep(hr, "followup")).toBe(hr.followUp);
    expect(promptForStep(hr, "specifics")).toContain("concrete");
  });
});
