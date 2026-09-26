// PRD §7.5 — initRunner, runSample, runCode — the code runner's public
// surface (API Contract §3.1/§3.2). Real Worker execution (worker.ts,
// python-host.ts, sql-host.ts, runner-client.ts) — see docs/RUNNER_SPIKE.md
// for what could and couldn't be verified end-to-end in this sandbox
// (no live browser/Worker environment under Vitest's Node test runner).

import type { Lang, RunResult, TestCase } from "../../contracts";
import { MAX_CODE_CHARS, MAX_TESTS_PER_RUN } from "../config";
import { GradingError } from "../errors";
import { getQuestionOrThrow } from "../deps";
import { preload, runInWorker } from "./runner-client";

export { verifyRunnerLoads, type RunnerLoadStatus } from "./loadCheck";

/**
 * Validates a code submission against the input-limit constants (hard rule
 * §3.2) before any runner work starts.
 */
function validateRunInputs(code: string, tests: TestCase[]): void {
  if (code.length > MAX_CODE_CHARS) {
    throw new GradingError("INVALID_STEP", `Code is too long (max ${MAX_CODE_CHARS} characters).`);
  }
  if (tests.length > MAX_TESTS_PER_RUN) {
    throw new GradingError("INVALID_STEP", `Too many tests for one run (max ${MAX_TESTS_PER_RUN}).`);
  }
}

/** Idempotently preloads the runner Worker's Python engine (Setup screen's job — see docs/BACKEND1_REPORT.md's handoff note to Shruthi). */
export async function initRunner(): Promise<{ ready: boolean }> {
  return preload("python");
}

export async function runSample(
  questionId: string,
  code: string,
  step: "apply" | "transfer",
): Promise<RunResult> {
  // Resolves the question via the configured dependency (grading/deps.ts) so
  // this module never imports the engine directly. Surfaces NOT_FOUND if
  // configureGrading was never called or the id is unknown, per this
  // prompt's §2 instruction, rather than crashing.
  const question = getQuestionOrThrow(questionId);
  const tests = step === "transfer" ? (question.variant?.tests.filter((t) => !t.hidden) ?? []) : (question.tests?.filter((t) => !t.hidden) ?? []);
  const lang = question.lang;
  if (!lang) throw new GradingError("INVALID_STEP", `Question ${questionId} has no language for a code step`);
  validateRunInputs(code, tests);
  return runInWorker(code, lang, tests);
}

export async function runCode(code: string, lang: Lang, tests: TestCase[]): Promise<RunResult> {
  validateRunInputs(code, tests);
  return runInWorker(code, lang, tests);
}
