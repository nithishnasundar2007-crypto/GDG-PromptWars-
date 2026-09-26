// Owner: Suchit. initRunner, runSample, runCode — the code runner's public
// surface (API Contract §3.1/§3.2). Full implementation (preload, per-run
// RUNNER_TIMEOUT_MS, hidden-test execution) is M1; verifyRunnerLoads below is
// the M0 scaffold's real, working piece — see loadCheck.ts.

import type { Lang, RunResult, TestCase } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";

export { verifyRunnerLoads, type RunnerLoadStatus } from "./loadCheck";

export async function initRunner(): Promise<{ ready: boolean }> {
  throw new NotImplementedError("initRunner", "Suchit", "M1");
}

export async function runSample(
  _questionId: string,
  _code: string,
  _step: "apply" | "transfer",
): Promise<RunResult> {
  throw new NotImplementedError("runSample", "Suchit", "M1");
}

export async function runCode(_code: string, _lang: Lang, _tests: TestCase[]): Promise<RunResult> {
  throw new NotImplementedError("runCode", "Suchit", "M1");
}
