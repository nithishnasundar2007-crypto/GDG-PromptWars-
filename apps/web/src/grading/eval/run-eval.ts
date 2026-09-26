// PRD §8.4 — runEval (Task 9, frozen signature per this task's §2 list).
// Grades every labelled answer through the REAL gradeRubricStep pipeline
// (Grader -> quote matcher -> Verifier) and compares the system's `met`
// verdict per rubric point against the human label, to check the Grader-
// human agreement / false-award / false-reject targets (PRD §8.4).
//
// This function makes no assumption about whether the underlying AI calls
// are real or mocked — that's determined entirely by whatever `fetch` does
// when this runs. In this sandbox (no live Gemini key), every invocation —
// including the recorded results in eval/results/ — used a mocked AI layer
// (see docs/BACKEND1_REPORT.md for exactly how, and why that's an honest
// limitation, not a claim that live-Gemini targets were met).

import type { Question, Result } from "../../contracts";
import { err, ok } from "../../contracts/errors";
import { gradeRubricStep } from "../pipeline/rubric-step";
import { PROMPT_REGISTRY } from "../prompts";
import { addPointResult, computeRates, emptyConfusion } from "./metrics";
import type { EvalReport, LabelledAnswer } from "./types";

function toSyntheticQuestion(item: LabelledAnswer): Question {
  return {
    id: item.id,
    topicId: "eval",
    track: "technical",
    role: "probe",
    prompt: item.question,
    rubrics: { [item.step]: item.rubric },
    targetTimeMs: {},
  };
}

/**
 * Grades every item in `labelled` and reports Grader-human agreement,
 * false-award rate, and false-reject rate across all rubric points.
 *
 * @param labelled hand-labelled answers (eval/labelled-answers/labelled.json
 *   for the real 30-answer run; a small synthetic set in tests)
 */
export async function runEval(labelled: LabelledAnswer[]): Promise<Result<EvalReport>> {
  if (labelled.length === 0) {
    return err("INVALID_STEP", "runEval requires at least one labelled answer.");
  }

  let confusion = emptyConfusion();
  let totalPoints = 0;

  for (const item of labelled) {
    const question = toSyntheticQuestion(item);
    const { rubric } = await gradeRubricStep(question, item.step, item.answer);
    for (const point of item.rubric) {
      const systemMet = rubric.find((r) => r.pointId === point.id)?.met ?? false;
      const humanLabel = item.humanPointLabels[point.id] ?? false;
      confusion = addPointResult(confusion, systemMet, humanLabel);
      totalPoints += 1;
    }
  }

  const rates = computeRates(confusion);
  return ok({
    promptVersion: PROMPT_REGISTRY.grader.version,
    totalAnswers: labelled.length,
    totalPoints,
    confusion,
    ...rates,
    mockedAiLayer: true,
  });
}
