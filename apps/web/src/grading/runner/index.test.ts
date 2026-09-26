// PRD §7.5 — runner/index.ts's own logic (input-limit validation, question
// lookup, dispatch), with runner-client mocked (the real Worker needs a
// browser environment — see docs/RUNNER_SPIKE.md).

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Question, RunResult, TestCase } from "../../contracts";
import { configureGrading, resetGradingDeps } from "../deps";
import { GradingError } from "../errors";

const okRun: RunResult = { passed: true, results: [], runtimeMs: 1 };

vi.mock("./runner-client", () => ({
  preload: vi.fn(async () => ({ ready: true })),
  runInWorker: vi.fn(async () => okRun),
}));

const question: Question = {
  id: "q1",
  topicId: "tp",
  track: "technical",
  role: "probe",
  prompt: "p",
  lang: "python",
  rubrics: {},
  targetTimeMs: {},
  tests: [{ id: "t1", input: "1", expected: "1", hidden: false }],
  variant: { prompt: "v", tests: [{ id: "t2", input: "2", expected: "2", hidden: false }] },
};

afterEach(() => {
  resetGradingDeps();
  vi.clearAllMocks();
});

describe("initRunner", () => {
  it("preloads python", async () => {
    const { initRunner } = await import("./index");
    expect(await initRunner()).toEqual({ ready: true });
  });
});

describe("runCode", () => {
  it("rejects code over the max length", async () => {
    const { runCode } = await import("./index");
    await expect(runCode("x".repeat(20_001), "python", [])).rejects.toBeInstanceOf(GradingError);
  });

  it("rejects too many tests", async () => {
    const { runCode } = await import("./index");
    const tests: TestCase[] = Array.from({ length: 51 }, (_, i) => ({ id: `t${i}`, input: "", expected: "", hidden: false }));
    await expect(runCode("ok", "python", tests)).rejects.toBeInstanceOf(GradingError);
  });

  it("runs valid code through the worker client", async () => {
    const { runCode } = await import("./index");
    const result = await runCode("print(1)", "python", []);
    expect(result).toEqual(okRun);
  });
});

describe("runSample", () => {
  it("throws NOT_FOUND before configureGrading is wired up", async () => {
    const { runSample } = await import("./index");
    await expect(runSample("q1", "code", "apply")).rejects.toBeInstanceOf(GradingError);
  });

  it("resolves the question via configureGrading and runs its visible apply tests", async () => {
    configureGrading({ getQuestion: (id) => (id === "q1" ? question : undefined) });
    const { runSample } = await import("./index");
    const { runInWorker } = await import("./runner-client");
    const result = await runSample("q1", "code", "apply");
    expect(result).toEqual(okRun);
    expect(vi.mocked(runInWorker)).toHaveBeenCalledWith("code", "python", question.tests);
  });

  it("uses the variant's visible tests for transfer", async () => {
    configureGrading({ getQuestion: () => question });
    const { runSample } = await import("./index");
    const { runInWorker } = await import("./runner-client");
    await runSample("q1", "code", "transfer");
    expect(vi.mocked(runInWorker)).toHaveBeenCalledWith("code", "python", question.variant?.tests);
  });
});
