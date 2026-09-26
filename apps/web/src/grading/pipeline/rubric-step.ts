// PRD F9 — Proof-Based Grading: the open-ended (Recognize/Explain/HR) grading
// path — Grader -> quote matcher -> Verifier, run per rubric point, with a
// point `met` only when both the quote matcher AND the Verifier agree
// (authoritative rule, never overridden by AI opinion —
// docs/PHASE0_AUDIT.md section F).
//
// Known ambiguity #2 (this prompt's spec, resolved): `RubricResult.spans`
// holds only the spans the quote matcher actually matched, not the Grader's
// raw output — an unmatched span is dropped before it ever reaches a
// Verifier call or the returned result.

import type { AnyStep, Question, RubricPoint, RubricResult } from "../../contracts";
import { generate } from "../ai";
import { graderOutputSchema, verifierOutputSchema } from "../ai/schemas";
import { VERIFIER_CONCURRENCY } from "../config";
import { mapWithConcurrency } from "../concurrency";
import { matchQuote } from "../quote";

export interface RubricStepResult {
  passed: boolean;
  rubric: RubricResult[];
}

async function gradeOnePoint(point: RubricPoint, rawSpans: string[], answer: string): Promise<RubricResult> {
  // Only spans the quote matcher actually confirms are kept — a span the
  // Grader claims but that isn't really in the answer is dropped entirely,
  // never trusted, and never reaches the Verifier.
  const matchedSpans = rawSpans.filter((s) => matchQuote(s, answer).matched);
  const quoteMatched = rawSpans.length > 0 && matchedSpans.length === rawSpans.length;

  if (!quoteMatched) {
    return { pointId: point.id, spans: matchedSpans, quoteMatched: false, verifierYes: false, met: false };
  }

  const verifierResult = await generate("verifier", { point, spans: matchedSpans }, verifierOutputSchema);
  const verifierYes = verifierResult.ok && verifierResult.data.satisfied;
  return { pointId: point.id, spans: matchedSpans, quoteMatched: true, verifierYes, met: verifierYes };
}

/**
 * Grades one open-ended step's rubric points against `answer`. No span for a
 * point (or an unmatched span) means the point is not met and the Verifier is
 * never called for it (hard rule §3.3: "points with no span or unmatched
 * quote never trigger a Verifier call").
 *
 * @param question the question this step belongs to (for the Grader prompt)
 * @param step which step is being graded (drives which rubric list is used)
 * @param answer the student's answer text
 */
export async function gradeRubricStep(question: Question, step: AnyStep, answer: string): Promise<RubricStepResult> {
  const points = question.rubrics[step] ?? [];
  if (points.length === 0) {
    return { passed: true, rubric: [] };
  }

  const graderResult = await generate(
    "grader",
    { question: question.prompt, step, rubricPoints: points, answer },
    graderOutputSchema,
  );

  // A failed Grader call fails the step rather than fabricating a grade.
  if (!graderResult.ok) {
    return {
      passed: false,
      rubric: points.map((p) => ({ pointId: p.id, spans: [], quoteMatched: false, verifierYes: false, met: false })),
    };
  }

  const rubric = await mapWithConcurrency(points, VERIFIER_CONCURRENCY, (point) => {
    const rawSpans = graderResult.data.points.find((p) => p.pointId === point.id)?.spans ?? [];
    return gradeOnePoint(point, rawSpans, answer);
  });

  const passed = points.every((p) => {
    const required = p.required;
    const r = rubric.find((x) => x.pointId === p.id);
    return !required || r?.met === true;
  });

  return { passed, rubric };
}
