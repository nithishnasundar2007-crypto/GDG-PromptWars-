// Owner: Uthai. The PRD 3.1 transition table, stored as DATA (not branching
// code), plus nextStep which reads it. This is an authoritative rule — it is
// never decided by the LLM (see docs/PHASE0_AUDIT.md section F).
//
// Reconstructed from the PRD's §3.1 table, which a PDF-text extraction pass
// scrambled column-wise during the Phase 0 audit; cross-checked against F4's
// gap table and the UI/UX gap labels (§5.1), which it now matches exactly.
// Uthai: please eyeball this against the live PRD tab before trusting the
// unit tests below as final (docs/PHASE0_AUDIT.md, risk R2).

import type { AnyStep, GapType, GradeResult, HrStepId, LadderState, StepId } from "../../contracts";

interface TransitionRow {
  onPass: StepId | "done";
  onFail: StepId | "done";
  gapOnFail: GapType | null; // null = deferred (Recognize defers to Hint's outcome)
  gapOnPass?: GapType; // Hint passing still records a gap: the student needed the hint
}

// Technical track — PRD 3.1.
export const TECHNICAL_TRANSITIONS: Record<StepId, TransitionRow> = {
  recognize: { onPass: "apply", onFail: "hint", gapOnFail: null },
  hint: { onPass: "apply", onFail: "apply", gapOnFail: "concept", gapOnPass: "recall" },
  apply: { onPass: "explain", onFail: "explain", gapOnFail: "coding" },
  explain: { onPass: "transfer", onFail: "done", gapOnFail: "explaining" },
  transfer: { onPass: "done", onFail: "done", gapOnFail: "adapting" },
};

interface HrTransitionRow {
  onPass: HrStepId | "done";
  onFail: HrStepId | "done";
  gapOnFail: GapType;
}

// HR track — PRD 3.1 HR table. Sequential; each step is reached regardless
// of the previous step's result (no skip logic on this track).
export const HR_TRANSITIONS: Record<HrStepId, HrTransitionRow> = {
  structure: { onPass: "specifics", onFail: "specifics", gapOnFail: "structure" },
  specifics: { onPass: "followup", onFail: "followup", gapOnFail: "vague" },
  followup: { onPass: "done", onFail: "done", gapOnFail: "followup" },
};

export interface NextStepResult {
  next: AnyStep | "done";
  assisted: boolean;
  gap: GapType | undefined;
}

function isHrStep(step: AnyStep): step is HrStepId {
  return step === "structure" || step === "specifics" || step === "followup";
}

/**
 * Applies the transition table for one step's result. Pure function — no
 * storage, no network, so it's tested without a Repository or Gemini.
 */
export function nextStep(ladder: LadderState, grade: GradeResult): NextStepResult {
  const step = grade.step;

  if (isHrStep(step)) {
    const row = HR_TRANSITIONS[step];
    return {
      next: grade.passed ? row.onPass : row.onFail,
      assisted: ladder.assisted,
      gap: grade.passed ? undefined : row.gapOnFail,
    };
  }

  const row = TECHNICAL_TRANSITIONS[step as StepId];
  const assisted = ladder.assisted || (step === "hint" && !grade.passed);
  const gap = grade.passed ? row.gapOnPass : (row.gapOnFail ?? undefined);

  return {
    next: grade.passed ? row.onPass : row.onFail,
    assisted,
    gap,
  };
}
