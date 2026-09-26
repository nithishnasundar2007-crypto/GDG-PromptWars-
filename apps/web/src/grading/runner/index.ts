// Owner: Suchit. initRunner, runSample, runCode — the code runner's public
// surface (API Contract §3.1/§3.2). Full implementation (preload, per-run
// RUNNER_TIMEOUT_MS, hidden-test execution) is M1; verifyRunnerLoads below is
// the M0 scaffold's real, working piece — see loadCheck.ts.

import type { Lang, RunResult, TestCase } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";
import { MAX_CODE_CHARS, MAX_TESTS_PER_RUN } from "../config";
import { GradingError } from "../errors";
import { getQuestionOrThrow } from "../deps";

export { verifyRunnerLoads, type RunnerLoadStatus } from "./loadCheck";

/**
 * Validates a code submission against the input-limit constants (hard rule
 * §3.2) before any runner work starts. Real Worker execution is still Task 3
 * / M1 work (see docs/RUNNER_SPIKE.md) — this check runs regardless of that,
 * since it's cheap and needed the moment the runner is wired up.
 */
function validateRunInputs(code: string, tests: TestCase[]): void {
  if (code.length > MAX_CODE_CHARS) {
    throw new GradingError("INVALID_STEP", `Code is too long (max ${MAX_CODE_CHARS} characters).`);
  }
  if (tests.length > MAX_TESTS_PER_RUN) {
    throw new GradingError("INVALID_STEP", `Too many tests for one run (max ${MAX_TESTS_PER_RUN}).`);
  }
}

export async function initRunner(): Promise<{ ready: boolean }> {
  throw new NotImplementedError("initRunner", "Suchit", "M1");
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
  validateRunInputs(code, tests);
  throw new NotImplementedError("runSample", "Suchit", "M1");
}

export async function runCode(code: string, _lang: Lang, tests: TestCase[]): Promise<RunResult> {
  validateRunInputs(code, tests);
  throw new NotImplementedError("runCode", "Suchit", "M1");
}
