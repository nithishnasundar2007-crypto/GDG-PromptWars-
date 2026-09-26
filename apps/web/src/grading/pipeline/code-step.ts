// PRD F9 — Proof-Based Grading: the code-step (Apply/Transfer) grading path.
// gradeStep is self-sufficient here (known ambiguity #1, resolved): it runs
// the code itself against the right test list rather than expecting a caller
// to have already run it, so a caller like submitStep can skip its own
// runCode call to avoid double-running the same submission.

import type { AnyStep, Lang, Question, RunResult } from "../../contracts";
import { runCode } from "../runner";

export function isCodeStep(step: AnyStep): step is "apply" | "transfer" {
  return step === "apply" || step === "transfer";
}

/** Runs the right test list (Apply's own tests, or Transfer's variant tests) for `question`. */
export async function gradeCodeStep(question: Question, step: "apply" | "transfer", answer: string): Promise<RunResult> {
  const tests = step === "transfer" ? (question.variant?.tests ?? []) : (question.tests ?? []);
  const lang: Lang | undefined = question.lang;
  if (!lang) {
    throw new Error(`Question ${question.id} has no language configured for a code step`);
  }
  return runCode(answer, lang, tests);
}
