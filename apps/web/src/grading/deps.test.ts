// PRD F9 — configureGrading's default-before-wired behavior must throw a
// clear, typed NOT_FOUND error rather than crashing (this prompt's §2).

import { afterEach, describe, expect, it } from "vitest";
import type { Question } from "../contracts";
import { configureGrading, getQuestionOrThrow, resetGradingDeps } from "./deps";
import { GradingError } from "./errors";

const sampleQuestion: Question = {
  id: "q_1",
  topicId: "tp_1",
  track: "technical",
  role: "probe",
  prompt: "Sample question",
  rubrics: {},
  targetTimeMs: {},
};

afterEach(() => {
  resetGradingDeps();
});

describe("getQuestionOrThrow", () => {
  it("throws a NOT_FOUND GradingError before configureGrading is ever called", () => {
    expect(() => getQuestionOrThrow("q_1")).toThrow(GradingError);
    try {
      getQuestionOrThrow("q_1");
    } catch (e) {
      expect(e).toBeInstanceOf(GradingError);
      expect((e as GradingError).code).toBe("NOT_FOUND");
    }
  });

  it("throws NOT_FOUND for an unknown id once wired up", () => {
    configureGrading({ getQuestion: () => undefined });
    expect(() => getQuestionOrThrow("missing")).toThrow(GradingError);
  });

  it("returns the question once wired up and found", () => {
    configureGrading({ getQuestion: (id) => (id === "q_1" ? sampleQuestion : undefined) });
    expect(getQuestionOrThrow("q_1")).toBe(sampleQuestion);
  });
});
