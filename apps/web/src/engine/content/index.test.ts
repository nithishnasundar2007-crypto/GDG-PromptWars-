import { describe, expect, it } from "vitest";
import {
  approachFor,
  companyTopicIds,
  drillKindFor,
  drillTemplateFor,
  getCompanies,
  getQuestion,
  getRoundMap,
  ladderQuestionsForTopic,
  pickQuestion,
  redactHiddenTests,
  topicsForScope,
  validateSeedBank,
} from "./index";

describe("seed bank", () => {
  it("passes its own validation", () => {
    expect(validateSeedBank()).toEqual([]);
  });

  it("sprint scope: 1 company, 3 rounds, the 3 PRD topics (plus the HR topic)", async () => {
    const companies = await getCompanies("sprint");
    expect(companies).toHaveLength(1);
    expect(companies[0]!.rounds).toHaveLength(3);
    const { topics } = await getRoundMap("co_zoho", "sprint");
    const names = topics.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["Graphs", "SQL Joins", "Project Explanation"]));
  });

  it("two-week scope: 2 companies and 12 topics", async () => {
    const companies = await getCompanies("two-week");
    expect(companies.map((c) => c.id).sort()).toEqual(["co_freshworks", "co_zoho"]);
    expect(topicsForScope("two-week")).toHaveLength(12);
    const used = new Set(companies.flatMap((c) => companyTopicIds(c)));
    expect(used.size).toBe(12);
  });

  it("an unknown company is NOT_FOUND", async () => {
    await expect(getRoundMap("co_nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.each(["tp_graphs", "tp_sql_joins", "tp_project", "tp_hr_communication"])(
    "%s has probe, confirm and retest questions",
    (topicId) => {
      const roles = new Set(ladderQuestionsForTopic(topicId).map((q) => q.role));
      expect([...roles].sort()).toEqual(["confirm", "probe", "retest"]);
    },
  );

  it("every technical coding question has a visible sample, hidden tests and a hidden-test variant", () => {
    for (const id of ["q_bfs_probe", "q_bfs_grid_confirm", "q_bfs_hops_retest", "q_sql_left_join_probe"]) {
      const q = getQuestion(id)!;
      expect(q.tests!.some((t) => !t.hidden)).toBe(true);
      expect(q.tests!.some((t) => t.hidden)).toBe(true);
      expect(q.variant!.tests.every((t) => t.hidden)).toBe(true);
    }
  });

  it("drill-only questions never come out of a ladder", () => {
    const ids = ladderQuestionsForTopic("tp_graphs").map((q) => q.id);
    expect(ids).not.toContain("q_bfs_debug_drill");
    expect(getQuestion("q_bfs_debug_drill")).toBeDefined();
  });
});

describe("pickQuestion", () => {
  it("returns an unseen question of the requested role first", () => {
    const first = pickQuestion("tp_graphs", "probe", new Set());
    expect(first).toMatchObject({ fresh: true, question: { id: "q_bfs_probe" } });
    const confirm = pickQuestion("tp_graphs", "confirm", new Set(["q_bfs_probe"]));
    expect(confirm!.question.role).toBe("confirm");
  });

  it("gives a re-test a question the student has not seen", () => {
    const seen = new Set(["q_bfs_probe", "q_bfs_grid_confirm"]);
    const retest = pickQuestion("tp_graphs", "retest", seen)!;
    expect(retest.fresh).toBe(true);
    expect(seen.has(retest.question.id)).toBe(false);
  });

  it("falls back to another role's unseen question, then flags a repeat as not fresh", () => {
    const seenRetests = new Set(["q_bfs_broadcast_retest", "q_bfs_hops_retest"]);
    expect(pickQuestion("tp_graphs", "retest", seenRetests)).toMatchObject({ fresh: true });
    const all = new Set(ladderQuestionsForTopic("tp_graphs").map((q) => q.id));
    expect(pickQuestion("tp_graphs", "retest", all)).toMatchObject({ fresh: false });
  });

  it("returns undefined for a topic with no questions", () => {
    expect(pickQuestion("tp_trees", "probe", new Set())).toBeUndefined();
  });
});

describe("question helpers", () => {
  it("redacts hidden test inputs and expectations but keeps visible ones", () => {
    const shown = redactHiddenTests(getQuestion("q_bfs_probe")!);
    expect(shown.tests!.find((t) => !t.hidden)!.expected).toBe("1");
    for (const t of shown.tests!.filter((x) => x.hidden)) expect([t.input, t.expected]).toEqual(["", ""]);
    for (const t of shown.variant!.tests) expect([t.input, t.expected]).toEqual(["", ""]);
    expect(getQuestion("q_bfs_probe")!.tests!.find((t) => t.hidden)!.expected).not.toBe("");
  });

  it("has a hand-written approach for every ladder question", () => {
    expect(approachFor(getQuestion("q_bfs_probe")!)).toContain("BFS");
  });

  it("maps every gap type to a drill kind and a drill", () => {
    expect(drillKindFor("coding")).toBe("debug");
    expect(drillKindFor("recall")).toBe("flashcards");
    expect(drillKindFor("concept")).toBe("explainer");
    expect(drillKindFor("explaining")).toBe("reexplain");
    expect(drillKindFor("adapting")).toBe("variants");
    expect(drillKindFor("speed")).toBe("timed");
    for (const t of ["recall", "concept", "coding", "explaining", "adapting", "speed", "structure", "vague", "followup"] as const) {
      expect(drillTemplateFor("tp_unknown", t)).toBeDefined();
    }
  });
});
