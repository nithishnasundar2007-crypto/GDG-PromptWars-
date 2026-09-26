import { describe, expect, it } from "vitest";
import type { Gap, GapType } from "../../contracts";
import { buildDrill } from "./index";
import { runLadder, setup } from "../testUtils";

function gap(topicId: string, type: GapType, status: Gap["status"] = "confirmed"): Gap {
  return { id: `gap_${topicId}_${type}`, studentId: "st_1", topicId, step: "apply", type, status, attemptIds: ["a"], updatedAt: "t" };
}

describe("getDrill matches the drill to the gap type", () => {
  it.each([
    ["recall", "flashcards"],
    ["concept", "explainer"],
    ["coding", "debug"],
    ["explaining", "reexplain"],
    ["adapting", "variants"],
    ["speed", "timed"],
  ] as const)("%s gap -> %s drill, written for the topic", (type, kind) => {
    const drill = buildDrill(gap("tp_graphs", type));
    expect(drill).toMatchObject({ gapType: type, kind, topicId: "tp_graphs", gapId: `gap_tp_graphs_${type}` });
    expect(drill.content.length).toBeGreaterThan(30);
    expect(drill.minutes).toBeGreaterThan(0);
  });

  it("a coding gap on graphs gets the BFS debug drill; a coding gap on SQL joins gets the join one", () => {
    expect(buildDrill(gap("tp_graphs", "coding")).questionIds).toEqual(["q_bfs_debug_drill"]);
    expect(buildDrill(gap("tp_sql_joins", "coding")).questionIds).toEqual(["q_sql_debug_drill"]);
  });

  it("adapting and speed drills point at real questions to twist / time", () => {
    expect(buildDrill(gap("tp_graphs", "adapting")).questionIds!.length).toBeGreaterThan(0);
    expect(buildDrill(gap("tp_graphs", "speed")).questionIds!.length).toBeGreaterThan(0);
  });

  it("falls back to a generic drill for the gap type when the topic has none", () => {
    expect(buildDrill(gap("tp_trees", "coding"))).toMatchObject({ kind: "debug", topicId: "tp_trees" });
  });

  it("HR gaps get HR drills", () => {
    expect(buildDrill(gap("tp_hr_communication", "structure")).title).toContain("Situation");
  });

  it("getDrill returns the drill for a stored gap and refuses missing or fixed gaps", async () => {
    const h = await setup();
    await runLadder(h, "tp_graphs", "probe", ["wrong"], "apply");
    const [stored] = await h.repo.getGaps(h.student.id);
    expect(await h.drills.getDrill(stored!.id)).toMatchObject({ gapId: stored!.id, kind: "debug" });
    await expect(h.drills.getDrill("gap_nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await h.repo.upsertGap({ ...stored!, status: "fixed" });
    await expect(h.drills.getDrill(stored!.id)).rejects.toMatchObject({ code: "INVALID_STEP" });
  });
});
