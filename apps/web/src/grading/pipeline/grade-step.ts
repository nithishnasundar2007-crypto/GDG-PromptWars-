// PRD F9 — Proof-Based Grading: gradeStep (API Contract §3.2). Dispatches to
// the code-step or rubric-step path and never lets the LLM decide pass/fail
// directly — `passed` always comes from the test runner or from
// `quoteMatched && verifierYes`, both deterministic checks
// (docs/PHASE0_AUDIT.md section F).

import type { AnyStep, GradeResult, Question } from "../../contracts";
import { gradeCodeStep, isCodeStep } from "./code-step";
import { explain } from "./explain";
import { gradeRubricStep } from "./rubric-step";

/**
 * Grades one step of a ladder attempt end-to-end: runs the student's code
 * against hidden tests for Apply/Transfer, or runs Grader -> quote matcher ->
 * Verifier per rubric point for open-ended steps. Attaches Feedback only when
 * the step failed.
 *
 * @param question the question this step belongs to
 * @param step which step is being graded
 * @param answer the student's submitted answer (code or free text)
 * @returns the GradeResult — never throws for a normal grading outcome; a
 *   missing `question.lang` on a code step is a caller/config error, not a
 *   gradeable outcome, and still throws.
 */
export async function gradeStep(question: Question, step: AnyStep, answer: string): Promise<GradeResult> {
  if (isCodeStep(step)) {
    const run = await gradeCodeStep(question, step, answer);
    const partial: GradeResult = { step, passed: run.passed, run };
    if (run.passed) return partial;
    return { ...partial, feedback: await explain(question, step, answer, partial) };
  }

  const { passed, rubric } = await gradeRubricStep(question, step, answer);
  const partial: GradeResult = { step, passed, rubric };
  if (passed) return partial;
  return { ...partial, feedback: await explain(question, step, answer, partial) };
}
