import { describe, expect, it } from "vitest";
import type { Attempt, Gap } from "../../contracts";
import { getTopic } from "../content";
import { deriveCell, buildReadinessMap } from "./index";
import { runLadder, setup } from "../testUtils";

const graphs = getTopic("tp_graphs")!;

function attempt(id: string, step: Attempt["step"], passed: boolean, assisted = false, questionId = "q_bfs_probe"): Attempt {
  return {
    id,
    studentId: "st_1",
    questionId,
    ladderId: "ld_1",
    step,
    answer: "a",
    grade: { step, passed },
    assisted,
    timeMs: 1,
    createdAt: "t",
  };
}

function gap(status: Gap["status"], step: Gap["step"] = "apply", type: Gap["type"] = "coding"): Gap {
  return { id: `gap_${step}_${type}`, studentId: "st_1", topicId: "tp_graphs", step, type, status, attemptIds: [], updatedAt: "t" };
}

describe("cell state (evidence, not percentages)", () => {
  it("no attempts -> grey", () => {
    expect(deriveCell(graphs, "apply", [], [])).toEqual({ topicId: "tp_graphs", step: "apply", state: "grey", attemptIds: [] });
  });

  it("suspected gap -> amber", () => {
    expect(deriveCell(graphs, "apply", [attempt("a1", "apply", false)], [gap("suspected")]).state).toBe("amber");
  });

  it("confirmed gap -> red, and red outranks a suspected gap on the same cell", () => {
    const gaps = [gap("suspected", "apply", "speed"), gap("confirmed")];
    expect(deriveCell(graphs, "apply", [attempt("a1", "apply", false)], gaps).state).toBe("red");
  });

  it("fixed gap with an unassisted latest pass -> green", () => {
    const attempts = [attempt("a1", "apply", false), attempt("a2", "apply", true)];
    expect(deriveCell(graphs, "apply", attempts, [gap("fixed")]).state).toBe("green");
  });

  it("an unassisted pass with no gap -> green", () => {
    expect(deriveCell(graphs, "explain", [attempt("a1", "explain", true)], []).state).toBe("green");
  });

  it("only an assisted pass -> amber (not independent proof)", () => {
    expect(deriveCell(graphs, "apply", [attempt("a1", "apply", true, true)], []).state).toBe("amber");
  });

  it("a fail that has no gap yet (deferred recognize fail) -> amber", () => {
    expect(deriveCell(graphs, "recognize", [attempt("a1", "recognize", false)], []).state).toBe("amber");
  });

  it("hint attempts and hint-step gaps fold into the recognize column", () => {
    const cell = deriveCell(graphs, "recognize", [attempt("a1", "recognize", false), attempt("a2", "hint", true, true)], [
      gap("suspected", "hint", "recall"),
    ]);
    expect(cell.state).toBe("amber");
    expect(cell.attemptIds).toEqual(["a1", "a2"]);
  });

  it("only counts attempts on the cell's own topic and column", () => {
    const other = attempt("a2", "apply", true, false, "q_sql_left_join_probe");
    const cell = deriveCell(graphs, "apply", [attempt("a1", "explain", true), other], []);
    expect(cell.state).toBe("grey");
  });
});

describe("getReadinessMap", () => {
  it("has a row per company topic: technical columns recognize/apply/explain/transfer, HR columns structure/specifics/followup", async () => {
    const h = await setup();
    const map = await h.readiness.getReadinessMap(h.student.id);
    expect(map.companyId).toBe("co_zoho");
    expect(map.technical.map((r) => [r.topic.id, r.weight])).toEqual([
      ["tp_graphs", 5],
      ["tp_sql_joins", 4],
      ["tp_project", 3],
    ]);
    for (const row of map.technical) {
      expect(Object.keys(row.cells)).toEqual(["recognize", "apply", "explain", "transfer"]);
      expect(Object.values(row.cells).every((c) => c.state === "grey")).toBe(true);
    }
    expect(map.hr).toHaveLength(1);
    expect(Object.keys(map.hr[0]!.cells)).toEqual(["structure", "specifics", "followup"]);
  });

  it("goes grey -> amber -> red -> green as evidence arrives", async () => {
    const h = await setup();
    const state = async () => (await h.readiness.getReadinessMap(h.student.id)).technical[0]!.cells.apply.state;
    expect(await state()).toBe("grey");
    await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    expect(await state()).toBe("amber");
    await runLadder(h, "tp_graphs", "confirm", ["wrong"], "apply");
    expect(await state()).toBe("red");
    await runLadder(h, "tp_graphs", "retest", ["PASS"], "apply");
    expect(await state()).toBe("green");
  });

  it("rejects an unknown student", async () => {
    const h = await setup();
    await expect(h.readiness.getReadinessMap("st_nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("buildReadinessMap rejects a student whose company does not exist", () => {
    expect(() =>
      buildReadinessMap({ id: "s", name: "x", companyId: "co_nope", driveDate: "2026-10-03", hoursPerDay: 2, scope: "sprint" }, [], []),
    ).toThrow(/Unknown company/);
  });
});

describe("getCellEvidence", () => {
  it("returns the attempts and questions that explain why a cell has its state", async () => {
    const h = await setup();
    const { question } = await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    const ev = await h.readiness.getCellEvidence(h.student.id, "tp_graphs", "apply");
    expect(ev.cell).toMatchObject({ state: "amber", step: "apply" });
    expect(ev.attempts).toHaveLength(1);
    expect(ev.attempts[0]).toMatchObject({ answer: "wrong", step: "apply", question: { id: question.id } });
    expect(ev.attempts[0]!.grade.run!.firstFailure).toBeDefined();
    expect(ev.attempts[0]!.question.tests!.filter((t) => t.hidden).every((t) => t.expected === "")).toBe(true);
  });

  it("treats the hint step as the recognize column", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", ["wrong", "PASS"]);
    const ev = await h.readiness.getCellEvidence(h.student.id, "tp_graphs", "hint");
    expect(ev.cell.step).toBe("recognize");
    expect(ev.attempts.map((a) => a.step)).toEqual(["recognize", "hint"]);
  });

  it("an untested cell has no evidence", async () => {
    const h = await setup();
    const ev = await h.readiness.getCellEvidence(h.student.id, "tp_sql_joins", "explain");
    expect(ev).toMatchObject({ cell: { state: "grey" }, attempts: [] });
  });

  it("rejects unknown students/topics and steps that do not belong to the topic's track", async () => {
    const h = await setup();
    await expect(h.readiness.getCellEvidence("st_nope", "tp_graphs", "apply")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(h.readiness.getCellEvidence(h.student.id, "tp_nope", "apply")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(h.readiness.getCellEvidence(h.student.id, "tp_graphs", "structure")).rejects.toMatchObject({ code: "INVALID_STEP" });
    await expect(h.readiness.getCellEvidence(h.student.id, "tp_hr_communication", "apply")).rejects.toMatchObject({ code: "INVALID_STEP" });
  });
});
