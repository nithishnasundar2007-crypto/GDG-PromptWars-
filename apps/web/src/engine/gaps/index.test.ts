import { describe, expect, it } from "vitest";
import type { Gap } from "../../contracts";
import { DEFAULT_SLOW_FACTOR, isSlow, updateGaps, type GapOutcome } from "./index";

function outcome(overrides: Partial<GapOutcome> = {}): GapOutcome {
  return {
    studentId: "st_1",
    topicId: "tp_graphs",
    step: "apply",
    type: "coding",
    passed: false,
    assisted: false,
    attemptId: "att_1",
    isRetestOnFreshQuestion: true,
    ...overrides,
  };
}

const fail = (attemptId: string, o: Partial<GapOutcome> = {}) => outcome({ attemptId, ...o });
const pass = (attemptId: string, o: Partial<GapOutcome> = {}) => outcome({ passed: true, attemptId, ...o });

describe("gap state machine (PRD 3.1 / F4)", () => {
  it("first failure creates a suspected gap", () => {
    const gaps = updateGaps([], fail("att_1"));
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ status: "suspected", type: "coding", step: "apply", attemptIds: ["att_1"] });
  });

  it("second failure on the same topic + step confirms it", () => {
    let gaps = updateGaps([], fail("att_1"));
    gaps = updateGaps(gaps, fail("att_2"));
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.status).toBe("confirmed");
    expect(gaps[0]!.attemptIds).toEqual(["att_1", "att_2"]);
  });

  it("a confirmed gap that fails again stays confirmed and records the evidence", () => {
    let gaps = updateGaps([], fail("att_1"));
    gaps = updateGaps(gaps, fail("att_2"));
    gaps = updateGaps(gaps, fail("att_3"));
    expect(gaps[0]!.status).toBe("confirmed");
    expect(gaps[0]!.attemptIds).toEqual(["att_1", "att_2", "att_3"]);
  });

  it("a failure on a different topic does not confirm another topic's gap", () => {
    let gaps = updateGaps([], fail("att_1", { topicId: "tp_graphs" }));
    gaps = updateGaps(gaps, fail("att_2", { topicId: "tp_sql_joins" }));
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.status === "suspected")).toBe(true);
  });

  it("a failure on a different step does not confirm the gap", () => {
    let gaps = updateGaps([], fail("att_1", { step: "apply", type: "coding" }));
    gaps = updateGaps(gaps, fail("att_2", { step: "explain", type: "explaining" }));
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.status === "suspected")).toBe(true);
  });

  it("a hint-step failure is stored on the recognize column", () => {
    const gaps = updateGaps([], fail("att_1", { step: "hint", type: "concept" }));
    expect(gaps[0]).toMatchObject({ step: "recognize", type: "concept" });
  });

  it("a pass with no existing gap changes nothing", () => {
    expect(updateGaps([], pass("att_1"))).toHaveLength(0);
  });
});

describe("fixing gaps needs a fresh, unassisted re-test", () => {
  it("a clean pass on a fresh question fixes a suspected gap", () => {
    let gaps = updateGaps([], fail("att_1"));
    gaps = updateGaps(gaps, pass("att_2"));
    expect(gaps[0]!.status).toBe("fixed");
    expect(gaps[0]!.attemptIds).toEqual(["att_1", "att_2"]);
  });

  it("a passed fresh re-test fixes a confirmed gap", () => {
    let gaps = updateGaps([], fail("att_1"));
    gaps = updateGaps(gaps, fail("att_2"));
    gaps = updateGaps(gaps, pass("att_3"));
    expect(gaps[0]!.status).toBe("fixed");
  });

  it("a pass on a question the student already failed does not fix the gap (not a fresh re-test)", () => {
    let gaps = updateGaps([], fail("att_1"));
    gaps = updateGaps(gaps, fail("att_2"));
    const before = gaps;
    gaps = updateGaps(gaps, pass("att_3", { isRetestOnFreshQuestion: false }));
    expect(gaps[0]!.status).toBe("confirmed");
    expect(gaps).toBe(before);
  });

  it("an assisted pass never fixes a gap, even on a fresh question", () => {
    let gaps = updateGaps([], fail("att_1"));
    gaps = updateGaps(gaps, pass("att_2", { assisted: true }));
    expect(gaps[0]!.status).toBe("suspected");
    expect(gaps[0]!.attemptIds).toEqual(["att_1"]);
  });

  it("a passing step only fixes gaps on its own topic + step", () => {
    let gaps = updateGaps([], fail("att_1", { step: "apply", type: "coding" }));
    gaps = updateGaps(gaps, fail("att_2", { step: "explain", type: "explaining" }));
    gaps = updateGaps(gaps, pass("att_3", { step: "apply" }));
    expect(gaps.find((g) => g.step === "apply")!.status).toBe("fixed");
    expect(gaps.find((g) => g.step === "explain")!.status).toBe("suspected");
  });

  it("a fixed gap that fails again is confirmed straight away", () => {
    let gaps = updateGaps([], fail("att_1"));
    gaps = updateGaps(gaps, pass("att_2"));
    gaps = updateGaps(gaps, fail("att_3"));
    expect(gaps[0]!.status).toBe("confirmed");
  });

  it("an untouched gap is returned by reference so callers can diff", () => {
    const gaps = updateGaps([], fail("att_1", { topicId: "tp_graphs" }));
    const next = updateGaps(gaps, fail("att_2", { topicId: "tp_sql_joins" }));
    expect(next[0]).toBe(gaps[0]);
  });
});

describe("gap types are kept apart", () => {
  it("a recall gap and a concept gap on the recognize column are separate gaps", () => {
    let gaps = updateGaps([], fail("att_1", { step: "recognize", type: "recall" }));
    gaps = updateGaps(gaps, fail("att_2", { step: "hint", type: "concept" }));
    expect(gaps.map((g) => g.type).sort()).toEqual(["concept", "recall"]);
    expect(gaps.every((g) => g.status === "suspected")).toBe(true);
  });

  it("one clean recognize pass fixes both", () => {
    let gaps = updateGaps([], fail("att_1", { step: "recognize", type: "recall" }));
    gaps = updateGaps(gaps, fail("att_2", { step: "hint", type: "concept" }));
    gaps = updateGaps(gaps, pass("att_3", { step: "recognize" }));
    expect(gaps.every((g) => g.status === "fixed")).toBe(true);
  });
});

describe("Speed gap", () => {
  it("isSlow compares against the target time", () => {
    expect(isSlow(100, undefined)).toBe(false);
    expect(isSlow(100 * DEFAULT_SLOW_FACTOR, 100)).toBe(false);
    expect(isSlow(100 * DEFAULT_SLOW_FACTOR + 1, 100)).toBe(true);
  });

  it("the threshold is configurable (an assumption, not a PRD value)", () => {
    expect(isSlow(250, 100, 2)).toBe(true);
    expect(isSlow(250, 100, 3)).toBe(false);
  });

  it("a slow correct answer raises a suspected speed gap, a second confirms it", () => {
    let gaps: Gap[] = updateGaps([], pass("att_1", { slow: true, isRetestOnFreshQuestion: false }));
    expect(gaps[0]).toMatchObject({ type: "speed", status: "suspected" });
    gaps = updateGaps(gaps, pass("att_2", { slow: true, isRetestOnFreshQuestion: false }));
    expect(gaps[0]!.status).toBe("confirmed");
  });

  it("a fast fresh pass fixes the speed gap", () => {
    let gaps: Gap[] = updateGaps([], pass("att_1", { slow: true }));
    gaps = updateGaps(gaps, pass("att_2", { slow: false }));
    expect(gaps[0]!.status).toBe("fixed");
  });

  it("a slow pass does not fix a speed gap", () => {
    let gaps: Gap[] = updateGaps([], pass("att_1", { slow: true }));
    gaps = updateGaps(gaps, pass("att_2", { slow: true }));
    expect(gaps[0]!.status).toBe("confirmed");
  });
});
