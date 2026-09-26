// PRD F8 — Project Defense: generateProjectQuestions. Questions must
// reference specific details from the pasted project text, not generic
// project questions — enforced by the project-questions prompt's own
// instructions (apps/ai-proxy/src/prompts/project-questions.v1.ts), not by
// post-filtering here. Retries once if Gemini returns fewer than 6 or more
// than 8 questions (hard rule: "generates 6-8 or retries once").

import type { ProjectQuestion } from "../../contracts";
import { MAX_PROJECT_TEXT_CHARS } from "../config";
import { generate } from "../ai";
import { projectQuestionGeneratorOutputSchema } from "../ai/schemas";
import { GradingError } from "../errors";
import { getCachedQuestions, setCachedQuestions } from "./cache";

const MIN_QUESTIONS = 6;
const MAX_QUESTIONS = 8;

let questionCounter = 0;

function toProjectQuestions(
  questions: { area: ProjectQuestion["area"]; text: string; rubric: { text: string; required: boolean }[] }[],
): ProjectQuestion[] {
  return questions.map((q) => {
    questionCounter += 1;
    return {
      id: `pq_${questionCounter}`,
      area: q.area,
      text: q.text,
      rubric: q.rubric.map((r, i) => ({ id: `rpq_${questionCounter}_${i}`, text: r.text, required: r.required })),
    };
  });
}

/**
 * Generates 6-8 interviewer-style Project Defense questions from `projectText`.
 * Cached per session by content hash so resubmitting the same project text
 * doesn't re-call Gemini. Throws (with a typed message) if generation fails
 * or Gemini can't be coaxed into the 6-8 range after one retry.
 */
export async function generateProjectQuestions(projectText: string): Promise<ProjectQuestion[]> {
  if (projectText.length > MAX_PROJECT_TEXT_CHARS) {
    // No dedicated "input too long" ErrorCode exists in the frozen union
    // (API Contract §5.1); GEMINI_FAILED is the closest non-retryable-in-
    // spirit code lib/api already maps this call's failures to (see
    // docs/CONFLICTS.md, "input-limit error code reuse").
    throw new GradingError("GEMINI_FAILED", `Project text is too long (max ${MAX_PROJECT_TEXT_CHARS} characters).`);
  }

  const cached = await getCachedQuestions(projectText);
  if (cached) return cached;

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await generate("project-question-generator", { projectText }, projectQuestionGeneratorOutputSchema);
    if (!result.ok) {
      if (attempt === 0) continue;
      throw new GradingError(result.error.code, `generateProjectQuestions failed: ${result.error.message}`);
    }
    if (result.data.questions.length >= MIN_QUESTIONS && result.data.questions.length <= MAX_QUESTIONS) {
      const questions = toProjectQuestions(result.data.questions);
      await setCachedQuestions(projectText, questions);
      return questions;
    }
    if (attempt === 1) {
      // Out of range even after a retry: use what we got rather than fail
      // the whole flow, trimming to at most 8.
      const questions = toProjectQuestions(result.data.questions.slice(0, MAX_QUESTIONS));
      await setCachedQuestions(projectText, questions);
      return questions;
    }
  }
  throw new GradingError("GEMINI_FAILED", "generateProjectQuestions failed after retry");
}
