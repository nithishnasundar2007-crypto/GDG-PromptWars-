import { describe, expect, it } from "vitest";
import type { GradeResult, LadderState } from "../../contracts";
import { nextStep } from "./index";

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
