// Owner: Suchit. gradeStep — API Contract §3.2 / PRD §7.2's grading
// pipeline: code steps run against hidden tests; open-ended steps run
// Grader -> quote matcher -> Verifier, and a point is met only if BOTH pass
// (an authoritative rule, never overridden by AI opinion — see
// docs/PHASE0_AUDIT.md section F). explain() produces the four-part
// Feedback (F12) shown only when a step fails.
//
// The code-step path calls runCode (grading/runner), still a Suchit M1 stub;
// the open-ended path is wired end-to-end against AIService + matchQuote,
// both already real as of M0.

import type { AnyStep, Feedback, GradeResult, Question, RubricResult } from "../../contracts";
import { generate } from "../ai";
import { explainerOutputSchema, graderOutputSchema, verifierOutputSchema } from "../ai/schemas";
import { matchQuote } from "../quote";
import { runCode } from "../runner";

function isCodeStep(step: AnyStep): step is "apply" | "transfer" {
  return step === "apply" || step === "transfer";
}

async function gradeOpenStep(question: Question, step: AnyStep, answer: string): Promise<GradeResult> {
  const points = question.rubrics[step] ?? [];
  if (points.length === 0) {
    return { step, passed: true, rubric: [] };
  }

  const graderResult = await generate(
    "grader",
    { question: question.prompt, step, rubricPoints: points, answer },
    graderOutputSchema,
  );
  // A failed Grader call fails the step rather than fabricating a grade
  // (docs/PHASE0_AUDIT.md section J: "keep the answer, award nothing").
  if (!graderResult.ok) {
    return {
      step,
      passed: false,
      rubric: points.map((p) => ({ pointId: p.id, spans: [], quoteMatched: false, verifierYes: false, met: false })),
      feedback: await explain(question, step, answer, undefined),
    };
  }

  const rubric: RubricResult[] = [];
  for (const point of points) {
    const graderPoint = graderResult.data.points.find((p) => p.pointId === point.id);
    const spans = graderPoint?.spans ?? [];
    // Rule: a Grader span that can't be found in the answer is dropped, never
    // trusted; if there's no span for a point, it's not met and the Verifier
    // is not called at all.
    const quoteMatched = spans.length > 0 && spans.every((s) => matchQuote(s, answer).matched);

    let verifierYes = false;
    if (quoteMatched) {
      const verifierResult = await generate(
        "verifier",
        { point, spans },
        verifierOutputSchema,
      );
      verifierYes = verifierResult.ok && verifierResult.data.satisfied;
    }

    rubric.push({ pointId: point.id, spans, quoteMatched, verifierYes, met: quoteMatched && verifierYes });
  }

  const passed = points.every((p) => {
    const r = rubric.find((x) => x.pointId === p.id);
    return !p.required || r?.met === true;
  });

  return {
    step,
    passed,
    rubric,
    feedback: passed ? undefined : await explain(question, step, answer, undefined),
  };
}

export async function gradeStep(question: Question, step: AnyStep, answer: string): Promise<GradeResult> {
  if (isCodeStep(step)) {
    const tests = step === "transfer" ? (question.variant?.tests ?? []) : (question.tests ?? []);
    const lang = question.lang;
    if (!lang) throw new Error(`Question ${question.id} has no language for a code step`);
    const run = await runCode(answer, lang, tests);
    return {
      step,
      passed: run.passed,
      run,
      feedback: run.passed ? undefined : await explain(question, step, answer, undefined),
    };
  }
  return gradeOpenStep(question, step, answer);
}

export async function explain(
  question: Question,
  step: AnyStep,
  answer: string,
  grade: GradeResult | undefined,
): Promise<Feedback> {
  const result = await generate(
    "explainer",
    { question: question.prompt, step, answer, grade },
    explainerOutputSchema,
  );
  if (result.ok) return result.data;
  // Fallback per docs/PHASE0_AUDIT.md section J: never fabricate; keep it
  // generic rather than inventing specifics we don't have.
  return {
    whatHappened: "We couldn't generate detailed feedback right now.",
    whyWrong: "The feedback service is unavailable.",
    missing: "Try submitting again in a moment.",
    nextDrill: "Retry to see the full four-part feedback.",
  };
}
