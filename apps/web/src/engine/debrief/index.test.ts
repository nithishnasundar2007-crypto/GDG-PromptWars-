import { describe, expect, it } from "vitest";
import { looksStruggled, matchTopic } from "./index";
import { setup } from "../testUtils";
import { topicWeights, findCompany } from "../content";

const base = { companyId: "co_zoho", roundName: "Coding", date: "2026-09-26" };
const weights = topicWeights(findCompany("co_zoho", "sprint")!);

describe("debrief helpers", () => {
  it("reads a struggle only from the student's own words (or a blank answer)", () => {
    expect(looksStruggled("")).toBe(true);
    expect(looksStruggled("I could not finish it")).toBe(true);
    expect(looksStruggled("I froze and forgot the syntax")).toBe(true);
    expect(looksStruggled("I used BFS with a queue and explained why it is shortest")).toBe(false);
  });

  it("matches a logged question to the topic whose keywords fit best", () => {
    const ids = [...weights.keys()];
    expect(matchTopic("Find the shortest path using BFS in a graph", ids, weights)).toBe("tp_graphs");
    expect(matchTopic("Write a left join query", ids, weights)).toBe("tp_sql_joins");
    expect(matchTopic("What is your favourite colour?", ids, weights)).toBeUndefined();
  });
});

describe("saveDebrief", () => {
  it("stores the debrief and turns a struggled question into a suspected gap on the matching topic", async () => {
    const h = await setup({ scope: "two-week" });
    const { debrief, gaps } = await h.debrief.saveDebrief({
      ...base,
      studentId: h.student.id,
      items: [
        { question: "Find the shortest path in a graph", answer: "I couldn't remember BFS" },
        { question: "Write a join query for orders and customers", answer: "Used a left join and explained NULLs" },
      ],
    });
    expect(debrief).toMatchObject({ id: "db_1", studentId: h.student.id, roundName: "Coding" });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ topicId: "tp_graphs", status: "suspected", type: "concept", step: "recognize" });
    expect(debrief.gapIds).toEqual([gaps[0]!.id]);
    expect(await h.repo.getGaps(h.student.id)).toHaveLength(1);
  });

  it("classifies a forgotten answer as Recall", async () => {
    const h = await setup({ scope: "two-week" });
    const { gaps } = await h.debrief.saveDebrief({
      ...base,
      studentId: h.student.id,
      items: [{ question: "Explain BFS on a graph", answer: "My mind went blank, I forgot it" }],
    });
    expect(gaps[0]).toMatchObject({ type: "recall" });
  });

  it("a second struggle on the same topic confirms the gap, like a second failed probe", async () => {
    const h = await setup({ scope: "two-week" });
    const { gaps } = await h.debrief.saveDebrief({
      ...base,
      studentId: h.student.id,
      items: [
        { question: "Explain BFS on a graph", answer: "I could not" },
        { question: "Explain DFS traversal", answer: "no idea" },
      ],
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.status).toBe("confirmed");
  });

  it("feeds the plan: the new gap is scheduled for a confirmation probe", async () => {
    const h = await setup({ scope: "two-week" });
    await h.debrief.saveDebrief({
      ...base,
      studentId: h.student.id,
      items: [{ question: "Explain BFS on a graph", answer: "I could not" }],
    });
    const next = await h.planner.getNextTask(h.student.id);
    expect(next).toMatchObject({ kind: "confirm", topicId: "tp_graphs" });
  });

  it("an HR question becomes a Structure gap", async () => {
    const h = await setup({ scope: "two-week", companyId: "co_freshworks" });
    const { gaps } = await h.debrief.saveDebrief({
      ...base,
      roundName: "Managerial + HR",
      companyId: "co_freshworks",
      studentId: h.student.id,
      items: [{ question: "Tell me about a conflict with a teammate", answer: "" }],
    });
    expect(gaps[0]).toMatchObject({ topicId: "tp_hr_communication", type: "structure", step: "structure" });
  });

  it("a question that matches no topic is kept in the debrief but creates no gap", async () => {
    const h = await setup();
    const { debrief, gaps } = await h.debrief.saveDebrief({
      ...base,
      studentId: h.student.id,
      items: [{ question: "What is your favourite colour?", answer: "I don't know" }],
    });
    expect(gaps).toEqual([]);
    expect(debrief.items).toHaveLength(1);
  });

  it.each([
    [{ studentId: "st_nope" }, "NOT_FOUND"],
    [{ companyId: "co_nope" }, "NOT_FOUND"],
    [{ roundName: " " }, "INVALID_STEP"],
    [{ date: "26/09/2026" }, "INVALID_STEP"],
    [{ items: [] }, "INVALID_STEP"],
    [{ items: [{ question: " ", answer: "x" }] }, "INVALID_STEP"],
  ])("rejects bad input %j", async (bad, code) => {
    const h = await setup();
    await expect(
      h.debrief.saveDebrief({ ...base, studentId: h.student.id, items: [{ question: "q", answer: "a" }], ...bad }),
    ).rejects.toMatchObject({ code });
  });
});
