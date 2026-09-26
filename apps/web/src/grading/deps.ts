// PRD F9 — Proof-Based Grading: grading's one external dependency injection
// point. `runSample` takes only a questionId (API Contract §3.1) — grading
// must never import the engine directly (docs/PHASE0_AUDIT.md's module
// boundary rules) — so the caller (engine/session, via lib/api's wiring, see
// docs/BACKEND1_REPORT.md's handoff note to Uthai) must call
// `configureGrading` once at startup to supply a question lookup.
//
// Before `configureGrading` is called, the lookup throws a typed,
// NOT_FOUND-coded error rather than crashing (`grading/errors.ts`'s
// `GradingError`), so a caller that forgets to wire it up gets a clear,
// diagnosable failure instead of a stack trace from `undefined()`.

import type { Question } from "../contracts";
import { GradingError } from "./errors";

export interface GradingDeps {
  getQuestion: (id: string) => Question | undefined;
}

let deps: GradingDeps | undefined;

/**
 * Wires grading's question lookup to the engine's real question bank.
 * Call once at app startup (see docs/BACKEND1_REPORT.md handoff notes).
 */
export function configureGrading(newDeps: GradingDeps): void {
  deps = newDeps;
}

/** Looks up a question by id via the configured dependency, or throws NOT_FOUND. */
export function getQuestionOrThrow(id: string): Question {
  if (!deps) {
    throw new GradingError("NOT_FOUND", "grading.configureGrading was never called — no question lookup is wired up.");
  }
  const question = deps.getQuestion(id);
  if (!question) {
    throw new GradingError("NOT_FOUND", `No question found for id "${id}"`);
  }
  return question;
}

/** Test-only: resets the wired dependency between test cases. */
export function resetGradingDeps(): void {
  deps = undefined;
}
