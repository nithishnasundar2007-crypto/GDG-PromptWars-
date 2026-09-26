// PRD F8 — Project Defense: gradeProjectAnswer. Reuses the exact same
// Grader -> quote matcher -> Verifier machinery as the ladder's open-ended
// steps (grading/pipeline/rubric-step.ts), so a Project Defense answer is
// held to the same proof-based standard as a regular Explain step, run with
// VERIFIER_CONCURRENCY-capped Verifier calls.

import type { GradeResult, ProjectCardItem, ProjectQuestion, Question } from "../../contracts";
import { MAX_ANSWER_CHARS } from "../config";
import { GradingError } from "../errors";
import { explain } from "../pipeline/explain";
import { gradeRubricStep } from "../pipeline/rubric-step";

/** Wraps a ProjectQuestion + project text as a synthetic Question so the
 * rubric-step machinery (and the Explainer, for modelOutline) can run
 * unmodified — the project text is folded into the prompt so the Explainer
 * can build an outline from the student's own project details. */
function toSyntheticQuestion(pq: ProjectQuestion, projectText: string): Question {
  return {
    id: pq.id,
    topicId: "project",
    track: "technical",
    role: "probe",
    prompt: `${pq.text}\n\nProject description (for context only, not a grading criterion by itself):\n${projectText}`,
    rubrics: { explain: pq.rubric },
    targetTimeMs: {},
  };
}

export async function gradeProjectAnswer(
  pq: ProjectQuestion,
  projectText: string,
  answer: string,
): Promise<{ grade: GradeResult; card: ProjectCardItem }> {
  if (answer.length > MAX_ANSWER_CHARS) {
    throw new GradingError("GEMINI_FAILED", `Answer is too long (max ${MAX_ANSWER_CHARS} characters).`);
  }

  const question = toSyntheticQuestion(pq, projectText);
  const { passed, rubric } = await gradeRubricStep(question, "explain", answer);

  const missing = rubric
    .filter((r) => !r.met)
    .map((r) => pq.rubric.find((p) => p.id === r.pointId)?.text)
    .filter((text): text is string => Boolean(text));

  const partial: GradeResult = { step: "explain", passed, rubric };
  const feedback = passed ? undefined : await explain(question, "explain", answer, partial);
  const grade: GradeResult = { ...partial, feedback };

  const card: ProjectCardItem = {
    questionId: pq.id,
    strong: passed,
    missing,
    // Built from the Explainer's own output (which saw the student's project
    // text via `question.prompt` above), not string-joined here — the
    // "missing" summary is the closest deterministic proxy when the
    // Explainer call itself failed and fell back.
    modelOutline: passed ? undefined : (feedback?.missing ?? `Cover: ${missing.join("; ")}.`),
  };

  return { grade, card };
}
