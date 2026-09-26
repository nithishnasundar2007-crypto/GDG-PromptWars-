// PRD F12 — Clear Feedback: explain() produces the four-part Feedback shown
// only when a step fails. Calls the Explainer (Gemini); if that call itself
// fails, falls back to a deterministic, template-built Feedback constructed
// from the failing test or unmet rubric points (never a generic hardcoded
// string, never a fabricated specific — docs/PHASE0_AUDIT.md section J).

import type { AnyStep, Feedback, GradeResult, Question } from "../../contracts";
import { generate } from "../ai";
import { explainerOutputSchema } from "../ai/schemas";
import { fallbackFeedbackForCode, fallbackFeedbackForRubric } from "./fallback-feedback";

function fallbackFor(question: Question, step: AnyStep, grade: GradeResult): Feedback {
  if (grade.run) return fallbackFeedbackForCode(grade.run);
  if (grade.rubric) return fallbackFeedbackForRubric(grade.rubric, question.rubrics[step] ?? []);
  return {
    whatHappened: "We couldn't generate detailed feedback right now.",
    whyWrong: "The feedback service is unavailable.",
    missing: "Try submitting again in a moment.",
    nextDrill: "Retry to see the full four-part feedback.",
  };
}

/**
 * Produces Feedback for a failed step. Tries the Explainer (Gemini) first;
 * on any failure (network, timeout, bad JSON), returns a deterministic
 * fallback built from `grade` instead of fabricating detail we don't have.
 *
 * @param question the question the step belongs to
 * @param step which step failed
 * @param answer the student's answer text
 * @param grade the already-computed grade for this attempt (run and/or rubric)
 * @returns Feedback — never throws, never rejects
 */
export async function explain(question: Question, step: AnyStep, answer: string, grade: GradeResult): Promise<Feedback> {
  const result = await generate("explainer", { question: question.prompt, step, answer, grade }, explainerOutputSchema);
  if (result.ok) return result.data;
  return fallbackFor(question, step, grade);
}
