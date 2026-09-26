import { describe, expect, it } from "vitest";
import type { Gap, PlanItem } from "../../contracts";
import { NOW, runLadder, setup, type Harness } from "../testUtils";

function gap(topicId: string, status: Gap["status"], step: Gap["step"] = "apply", attempts = 1): Gap {
  return {
    id: `gap_st_1_${topicId}_${step}_coding`,
    studentId: "st_1",
    topicId,
    step,
    type: "coding",
    status,
    attemptIds: Array.from({ length: attempts }, (_, i) => `att_${i}`),
    updatedAt: "t",
  };
}

const items = (plan: { days: { items: PlanItem[] }[] }) => plan.days.flatMap((d) => d.items);
const todo = (plan: { days: { items: PlanItem[] }[] }) => items(plan).filter((i) => i.status === "todo");

async function withGaps(h: Harness, gaps: Gap[]) {
  for (const g of gaps) await h.repo.upsertGap(g);
  return h.planner.getPlan(h.student.id);
}

describe("next-task priority (PRD 7.3): confirmed > suspected > untested high-weight", () => {
  it("a fresh student gets first probes ordered by topic weight", async () => {
    const h = await setup();
    const plan = await h.planner.getPlan(h.student.id);
    expect(todo(plan).map((i) => [i.kind, i.topicId])).toEqual([
      ["probe", "tp_graphs"],
      ["probe", "tp_sql_joins"],
      ["probe", "tp_project"],
      ["probe", "tp_hr_communication"],
    ]);
    expect(await h.planner.getNextTask(h.student.id)).toMatchObject({ kind: "probe", topicId: "tp_graphs" });
  });

  it("confirmed gap (drill, then re-test) comes before a suspected gap, which comes before untested topics", async () => {
    const h = await setup();
    const plan = await withGaps(h, [gap("tp_sql_joins", "confirmed"), gap("tp_graphs", "suspected")]);
    expect(todo(plan).map((i) => i.kind)).toEqual(["drill", "retest", "confirm", "probe", "probe"]);
    const [drill, retest, confirm] = todo(plan);
    expect(drill).toMatchObject({ topicId: "tp_sql_joins", gapType: "coding", step: "apply" });
    expect(retest).toMatchObject({ topicId: "tp_sql_joins", gapId: drill!.gapId });
    expect(confirm).toMatchObject({ topicId: "tp_graphs" });
    expect(todo(plan).slice(3).map((i) => i.topicId)).toEqual(["tp_project", "tp_hr_communication"]);
  });

  it("a low-weight confirmed gap still beats a high-weight suspected gap", async () => {
    const h = await setup();
    const plan = await withGaps(h, [gap("tp_project", "confirmed", "explain"), gap("tp_graphs", "suspected")]);
    expect(todo(plan)[0]).toMatchObject({ kind: "drill", topicId: "tp_project" });
  });

  it("confirmed gaps are ordered by topic weight, then lowest failed step, then drill time", async () => {
    const h = await setup();
    const plan = await withGaps(h, [
      gap("tp_sql_joins", "confirmed", "apply"),
      gap("tp_graphs", "confirmed", "transfer"),
      gap("tp_graphs", "confirmed", "explain"),
    ]);
    const drills = todo(plan).filter((i) => i.kind === "drill");
    expect(drills.map((d) => [d.topicId, d.step])).toEqual([
      ["tp_graphs", "explain"],
      ["tp_graphs", "transfer"],
      ["tp_sql_joins", "apply"],
    ]);
  });

  it("a topic that already has a gap is not also scheduled as an untested first probe", async () => {
    const h = await setup();
    const plan = await withGaps(h, [gap("tp_graphs", "suspected")]);
    expect(todo(plan).filter((i) => i.kind === "probe").map((i) => i.topicId)).toEqual([
      "tp_sql_joins",
      "tp_project",
      "tp_hr_communication",
    ]);
  });

  it("topics without questions yet are not scheduled for a probe", async () => {
    const h = await setup({ scope: "two-week" });
    const probes = todo(await h.planner.getPlan(h.student.id)).filter((i) => i.kind === "probe");
    expect(probes.map((i) => i.topicId)).not.toContain("tp_trees");
    expect(probes.map((i) => i.topicId)).toContain("tp_graphs");
  });
});

describe("plan changes after new evidence (replan)", () => {
  it("a first failure adds a confirmation probe; a second turns it into drill + re-test; a fixed gap removes both", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    let plan = await h.planner.getPlan(h.student.id);
    expect(todo(plan)[0]).toMatchObject({ kind: "confirm", topicId: "tp_graphs" });
    expect(todo(plan).some((i) => i.kind === "drill")).toBe(false);

    await runLadder(h, "tp_graphs", "confirm", ["wrong"], "apply");
    plan = await h.planner.getPlan(h.student.id);
    expect(todo(plan).slice(0, 2).map((i) => i.kind)).toEqual(["drill", "retest"]);
    expect(todo(plan).some((i) => i.kind === "confirm")).toBe(false);

    await runLadder(h, "tp_graphs", "retest", ["PASS"], "apply");
    plan = await h.planner.getPlan(h.student.id);
    expect(todo(plan).some((i) => i.topicId === "tp_graphs")).toBe(false);
  });

  it("submitStep replans without being asked (the stored plan already reflects the new gap)", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    const stored = await h.repo.getPlan(h.student.id);
    expect(items(stored!).some((i) => i.kind === "confirm")).toBe(true);
  });

  it("task ids are stable across replans", async () => {
    const h = await setup();
    const a = await h.planner.getPlan(h.student.id);
    const b = await h.planner.getPlan(h.student.id);
    expect(items(a).map((i) => i.id)).toEqual(items(b).map((i) => i.id));
  });
});

describe("time budget", () => {
  it("fills each day up to hoursPerDay and rolls the rest to later days, starting today", async () => {
    const h = await setup({ hoursPerDay: 0.5 });
    const plan = await h.planner.getPlan(h.student.id);
    expect(plan.days[0]!.date).toBe("2026-09-26");
    for (const day of plan.days) {
      const minutes = day.items.reduce((s, i) => s + i.minutes, 0);
      expect(minutes <= 30 || day.items.length === 1).toBe(true);
    }
    expect(plan.days.length).toBeGreaterThan(1);
    expect(plan).toMatchObject({ studentId: h.student.id, driveDate: "2026-10-03", hoursPerDay: 0.5 });
  });

  it("stops scheduling at the drive date", async () => {
    const h = await setup({ hoursPerDay: 0.25, driveDate: "2026-09-27" });
    const plan = await h.planner.getPlan(h.student.id);
    expect(plan.days.map((d) => d.date).every((d) => d <= "2026-09-27")).toBe(true);
  });

  it("puts everything on today when the drive date is today", async () => {
    const h = await setup({ driveDate: "2026-09-26" });
    const plan = await h.planner.getPlan(h.student.id);
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0]!.date).toBe("2026-09-26");
  });

  it("when nothing is left to fix or probe, remaining days get a mock round", async () => {
    const h = await setup();
    for (const t of ["tp_graphs", "tp_sql_joins", "tp_project", "tp_hr_communication"]) {
      await runLadder(h, t, "probe", t === "tp_hr_communication" ? ["PASS", "PASS", "PASS"] : ["PASS", "PASS", "PASS", "PASS"]);
    }
    const plan = await h.planner.getPlan(h.student.id);
    expect(todo(plan).length).toBeGreaterThan(0);
    expect(todo(plan).every((i) => i.kind === "mock")).toBe(true);
  });
});

describe("getNextTask and completePlanItem", () => {
  it("returns the earliest todo item and moves on when it is completed", async () => {
    const h = await setup();
    const first = await h.planner.getNextTask(h.student.id);
    const plan = await h.planner.completePlanItem(first.id, "done");
    expect(items(plan).find((i) => i.id === first.id)).toMatchObject({ status: "done" });
    const second = await h.planner.getNextTask(h.student.id);
    expect(second.id).not.toBe(first.id);
    expect(second.topicId).toBe("tp_sql_joins");
  });

  it("a done item stays in the plan as history and is not scheduled again", async () => {
    const h = await setup();
    const first = await h.planner.getNextTask(h.student.id);
    await h.planner.completePlanItem(first.id, "done");
    const plan = await h.planner.getPlan(h.student.id);
    expect(items(plan).filter((i) => i.id === first.id)).toHaveLength(1);
    expect(items(plan).find((i) => i.id === first.id)!.status).toBe("done");
  });

  it("a skipped item is kept as history and comes back later, after the rest", async () => {
    const h = await setup();
    const first = await h.planner.getNextTask(h.student.id);
    const plan = await h.planner.completePlanItem(first.id, "skipped");
    expect(items(plan).find((i) => i.id === first.id)!.status).toBe("skipped");
    const pending = todo(plan);
    expect(pending[0]!.topicId).toBe("tp_sql_joins");
    expect(pending.at(-1)).toMatchObject({ kind: "probe", topicId: "tp_graphs" });
    expect(pending.at(-1)!.id).toBe(`${first.id}~1`);
    expect(new Set(items(plan).map((i) => i.id)).size).toBe(items(plan).length);
  });

  it("errors: unknown item, already completed item, invalid status, unknown student", async () => {
    const h = await setup();
    const first = await h.planner.getNextTask(h.student.id);
    await expect(h.planner.completePlanItem("pi_nope", "done")).rejects.toMatchObject({ code: "NOT_FOUND" });
    // @ts-expect-error deliberately invalid status
    await expect(h.planner.completePlanItem(first.id, "todo")).rejects.toMatchObject({ code: "INVALID_STEP" });
    await h.planner.completePlanItem(first.id, "done");
    await expect(h.planner.completePlanItem(first.id, "done")).rejects.toMatchObject({ code: "INVALID_STEP" });
    await expect(h.planner.getPlan("st_nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(h.planner.getNextTask("st_nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("dates are local calendar dates from the injected clock", async () => {
    const h = await setup();
    const plan = await h.planner.getPlan(h.student.id);
    expect(plan.days[0]!.date).toBe(
      `${NOW().getFullYear()}-${String(NOW().getMonth() + 1).padStart(2, "0")}-${String(NOW().getDate()).padStart(2, "0")}`,
    );
  });
});
