// PRD F8 — per-session project-question cache tests.

import { afterEach, describe, expect, it } from "vitest";
import { clearProjectQuestionCache, getCachedQuestions, setCachedQuestions } from "./cache";
import type { ProjectQuestion } from "../../contracts";

const questions: ProjectQuestion[] = [{ id: "pq_1", area: "architecture", text: "t", rubric: [] }];

afterEach(() => {
  clearProjectQuestionCache();
});

describe("project question cache", () => {
  it("misses before anything is cached", async () => {
    expect(await getCachedQuestions("some project text")).toBeUndefined();
  });

  it("hits after storing, keyed by (normalised) content, and is case/whitespace-insensitive", async () => {
    await setCachedQuestions("A Project About Graphs", questions);
    expect(await getCachedQuestions("a project   about graphs")).toEqual(questions);
  });

  it("misses for different content", async () => {
    await setCachedQuestions("project A", questions);
    expect(await getCachedQuestions("project B")).toBeUndefined();
  });

  it("clearProjectQuestionCache empties the cache", async () => {
    await setCachedQuestions("project A", questions);
    clearProjectQuestionCache();
    expect(await getCachedQuestions("project A")).toBeUndefined();
  });
});
