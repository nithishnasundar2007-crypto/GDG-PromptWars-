import { describe, expect, it } from "vitest";
import type { Gap } from "../../contracts";
import { updateGaps, type GapOutcome } from "./index";

function outcome(overrides: Partial<GapOutcome> = {}): GapOutcome {
  return {
    studentId: "st_1",
    topicId: "tp_graphs",
    step: "apply",
    type: "coding",
    passed: false,
    assisted: false,
    attemptId: "att_1",
    isRetestOnFreshQuestion: false,
    ...overrides,
  };
}

describe("gap state machine (PRD 3.1 / F4)", () => {
  it("first failure creates a suspected gap", () => {
    const gaps = updateGaps([], outcome());
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ status: "suspected", type: "coding" });
  });

  it("a pass with no existing gap changes nothing", () => {
    const gaps = updateGaps([], outcome({ passed: true }));
    expect(gaps).toHaveLength(0);
  });

  it("second failure on the same topic+step confirms the gap", () => {
    let gaps: Gap[] = updateGaps([], outcome({ attemptId: "att_1" }));
    gaps = updateGaps(gaps, outcome({ attemptId: "att_2" }));
    expect(gaps[0]!.status).toBe("confirmed");
    expect(gaps[0]!.attemptIds).toEqual(["att_1", "att_2"]);
  });

  it("a lucky one-off failure elsewhere doesn't confirm a different topic's gap", () => {
    let gaps: Gap[] = updateGaps([], outcome({ topicId: "tp_graphs", attemptId: "att_1" }));
    gaps = updateGaps(gaps, outcome({ topicId: "tp_sql_joins", attemptId: "att_2" }));
    expect(gaps).toHaveLength(2);
    expect(gaps.every((g) => g.status === "suspected")).toBe(true);
  });

  it("a clean pass fixes a suspected gap", () => {
    let gaps: Gap[] = updateGaps([], outcome({ attemptId: "att_1" }));
    gaps = updateGaps(gaps, outcome({ passed: true, attemptId: "att_2" }));
    expect(gaps[0]!.status).toBe("fixed");
  });

  it("an assisted pass never fixes a gap on its own", () => {
    let gaps: Gap[] = updateGaps([], outcome({ attemptId: "att_1" }));
    gaps = updateGaps(gaps, outcome({ passed: true, assisted: true, attemptId: "att_2" }));
    expect(gaps[0]!.status).toBe("suspected");
  });

  it("a passed re-test on a fresh question fixes the gap even though the ladder was assisted earlier", () => {
    let gaps: Gap[] = updateGaps([], outcome({ attemptId: "att_1" }));
    gaps = updateGaps(
      gaps,
      outcome({ passed: true, assisted: true, isRetestOnFreshQuestion: true, attemptId: "att_2" }),
    );
    expect(gaps[0]!.status).toBe("fixed");
  });

  it("a confirmed gap that fails again stays confirmed and records evidence", () => {
    let gaps: Gap[] = updateGaps([], outcome({ attemptId: "att_1" }));
    gaps = updateGaps(gaps, outcome({ attemptId: "att_2" })); // confirms
    gaps = updateGaps(gaps, outcome({ attemptId: "att_3" }));
    expect(gaps[0]!.status).toBe("confirmed");
    expect(gaps[0]!.attemptIds).toEqual(["att_1", "att_2", "att_3"]);
  });
});
