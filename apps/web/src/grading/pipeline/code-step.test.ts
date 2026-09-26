// PRD F9 — code-step unit tests. `runCode` is mocked (module-level) so this
// exercises only code-step.ts's own logic: test-list selection and the
// missing-language guard.

import { describe, expect, it, vi } from "vitest";
import type { Question, RunResult } from "../../contracts";
import { gradeCodeStep, isCodeStep } from "./code-step";

const okRun: RunResult = { passed: true, results: [], runtimeMs: 1 };

vi.mock("../runner", () => ({
  runCode: vi.fn(async () => okRun),
}));

const baseQuestion: Question = {
  id: "q1",
  topicId: "tp",
  track: "technical",
  role: "probe",
  prompt: "p",
  lang: "python",
  rubrics: {},
  targetTimeMs: {},
  tests: [{ id: "t1", input: "1", expected: "1", hidden: false }],
  variant: { prompt: "variant", tests: [{ id: "t2", input: "2", expected: "2", hidden: false }] },
};

describe("isCodeStep", () => {
  it("is true only for apply/transfer", () => {
    expect(isCodeStep("apply")).toBe(true);
    expect(isCodeStep("transfer")).toBe(true);
    expect(isCodeStep("explain")).toBe(false);
    expect(isCodeStep("recognize")).toBe(false);
  });
});

describe("gradeCodeStep", () => {
  it("uses question.tests for apply", async () => {
    const { runCode } = await import("../runner");
    const result = await gradeCodeStep(baseQuestion, "apply", "code");
    expect(result).toEqual(okRun);
    expect(vi.mocked(runCode)).toHaveBeenCalledWith("code", "python", baseQuestion.tests);
  });

  it("uses question.variant.tests for transfer", async () => {
    const { runCode } = await import("../runner");
    await gradeCodeStep(baseQuestion, "transfer", "code");
    expect(vi.mocked(runCode)).toHaveBeenCalledWith("code", "python", baseQuestion.variant?.tests);
  });

  it("throws when the question has no language configured", async () => {
    // exactOptionalPropertyTypes: an optional field means absent, not
    // present-with-value-undefined, so this omits the key via rest-destructure
    // rather than `{ ...baseQuestion, lang: undefined }`.
    const { lang: _lang, ...noLangQuestion } = baseQuestion;
    await expect(gradeCodeStep(noLangQuestion, "apply", "code")).rejects.toThrow(/no language configured/);
  });

  it("uses an empty test list for apply when question.tests is undefined", async () => {
    const { runCode } = await import("../runner");
    const { tests: _tests, ...noTestsQuestion } = baseQuestion;
    await gradeCodeStep(noTestsQuestion, "apply", "code");
    expect(vi.mocked(runCode)).toHaveBeenCalledWith("code", "python", []);
  });

  it("uses an empty test list for transfer when question.variant is undefined", async () => {
    const { runCode } = await import("../runner");
    const { variant: _variant, ...noVariantQuestion } = baseQuestion;
    await gradeCodeStep(noVariantQuestion, "transfer", "code");
    expect(vi.mocked(runCode)).toHaveBeenCalledWith("code", "python", []);
  });
});
