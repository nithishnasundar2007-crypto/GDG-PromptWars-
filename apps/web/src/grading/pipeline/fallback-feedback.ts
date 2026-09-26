// PRD F12 — Clear Feedback: a deterministic, template-built Feedback used
// whenever the Explainer (Gemini) call itself fails. Never fabricates
// specifics we don't have (docs/PHASE0_AUDIT.md section J: "keep the answer,
// award nothing") — every sentence here is built only from data we already
// hold (the failing test, or the unmet rubric points), never invented.
//
// Every string obeys the UI/UX accessibility rules: plain text, short,
// grade-8 reading level, no color/visual references, actionable.

import type { RubricPoint, RubricResult, RunResult } from "../../contracts";
import type { Feedback } from "../../contracts";

/** Builds fallback Feedback for a failed code step from its first failing test. */
export function fallbackFeedbackForCode(run: RunResult): Feedback {
  const failure = run.firstFailure ?? run.results.find((r) => !r.passed);
  if (!failure) {
    return {
      whatHappened: "Your code did not pass all the tests.",
      whyWrong: "One or more tests failed, but the details were not saved.",
      missing: "Re-run the tests to see which one failed.",
      nextDrill: "Try the sample tests again before resubmitting.",
    };
  }

  if (failure.timedOut) {
    return {
      whatHappened: "Your code ran too long on one of the tests.",
      whyWrong: "The test timed out before your code finished running.",
      missing: "Check for a loop that never ends or runs too many times.",
      nextDrill: "Trace through your loop by hand on the sample input.",
    };
  }

  const expectedActual =
    failure.expected !== undefined && failure.actual !== undefined
      ? `Expected ${failure.expected}, but got ${failure.actual}.`
      : (failure.error ?? "The output did not match what was expected.");

  return {
    whatHappened: `Test ${failure.testId} failed.`,
    whyWrong: expectedActual,
    missing: "Check the logic that produces this output for this input.",
    nextDrill: "Re-run the visible tests after fixing the logic.",
  };
}

/** Builds fallback Feedback for a failed open-ended step from its unmet rubric points. */
export function fallbackFeedbackForRubric(rubric: RubricResult[], points: RubricPoint[]): Feedback {
  const unmet = rubric.filter((r) => !r.met);
  const unmetTexts = unmet
    .map((r) => points.find((p) => p.id === r.pointId)?.text)
    .filter((text): text is string => Boolean(text));

  if (unmetTexts.length === 0) {
    return {
      whatHappened: "Your answer did not fully cover what this step needs.",
      whyWrong: "Some required points were not found in your answer.",
      missing: "Add more detail to your answer.",
      nextDrill: "Reread the question and answer each part directly.",
    };
  }

  return {
    whatHappened: "Your answer is missing some required points.",
    whyWrong: `We could not find clear evidence of: ${unmetTexts.join("; ")}.`,
    missing: unmetTexts.join("; "),
    nextDrill: "Rewrite your answer so it states each missing point directly.",
  };
}
