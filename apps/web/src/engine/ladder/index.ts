// Owner: Uthai. The PRD 3.1 transition table, stored as DATA (not branching
// code), plus nextStep which reads it. This is an authoritative rule — it is
// never decided by the LLM (see docs/PHASE0_AUDIT.md section F).
//
// Reconstructed from the PRD's §3.1 table, which a PDF-text extraction pass
// scrambled column-wise during the Phase 0 audit; cross-checked against F4's
// gap table and the UI/UX gap labels (§5.1), which it now matches exactly.
// Uthai: please eyeball this against the live PRD tab before trusting the
// unit tests below as final (docs/PHASE0_AUDIT.md, risk R2).

import type {
  AnyStep,
  GapType,
  GradeResult,
  HrStepId,
  LadderState,
  Question,
  StepId,
  Track,
} from "../../contracts";

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

// ---------------------------------------------------------------------------
// Ladder construction and bookkeeping (pure; storage is the caller's job)
// ---------------------------------------------------------------------------

export const TECHNICAL_STEPS: readonly StepId[] = ["recognize", "hint", "apply", "explain", "transfer"];
export const HR_STEPS: readonly HrStepId[] = ["structure", "specifics", "followup"];

export function stepsFor(track: Track): readonly AnyStep[] {
  return track === "hr" ? HR_STEPS : TECHNICAL_STEPS;
}

export function firstStepFor(track: Track): AnyStep {
  return track === "hr" ? "structure" : "recognize";
}

/** Readiness columns fold Hint into Recognize (API Contract 2.5). */
export function columnOf(step: AnyStep): AnyStep {
  return step === "hint" ? "recognize" : step;
}

export function newLadder(input: {
  id: string;
  studentId: string;
  questionId: string;
  track: Track;
  startStep?: AnyStep;
  startedAt: string;
}): LadderState {
  return {
    id: input.id,
    studentId: input.studentId,
    questionId: input.questionId,
    track: input.track,
    current: input.startStep ?? firstStepFor(input.track),
    assisted: false,
    outcomes: {},
    startedAt: input.startedAt,
  };
}

/**
 * Records one step's result on the ladder and moves it to the step chosen by
 * nextStep. An attempt is "assisted" if the approach was already revealed
 * earlier in the ladder, or if it is the Hint step itself (a hinted pass is
 * never independent proof).
 */
export function applyStepResult(
  ladder: LadderState,
  input: { step: AnyStep; passed: boolean; timeMs: number; attemptId: string },
  next: NextStepResult,
): LadderState {
  return {
    ...ladder,
    current: next.next,
    assisted: next.assisted,
    outcomes: {
      ...ladder.outcomes,
      [input.step]: {
        passed: input.passed,
        assisted: attemptWasAssisted(ladder, input.step),
        timeMs: input.timeMs,
        attemptId: input.attemptId,
      },
    },
  };
}

export function attemptWasAssisted(ladder: LadderState, step: AnyStep): boolean {
  return ladder.assisted || step === "hint";
}

const HR_SPECIFICS_PROMPT =
  "Make it concrete: name a real example, say exactly what you did yourself, and give a number or outcome.";

/** The prompt shown for the step the ladder just moved to (hint, follow-up or variant). */
export function promptForStep(question: Question, step: AnyStep | "done"): string | undefined {
  switch (step) {
    case "done":
      return undefined;
    case "recognize":
    case "structure":
      return question.prompt;
    case "hint":
      return question.hint ?? "Think about which approach fits, then try again.";
    case "apply":
      return question.prompt;
    case "explain":
    case "followup":
      return question.followUp ?? "Explain your answer and why it works.";
    case "transfer":
      return question.variant?.prompt;
    case "specifics":
      return HR_SPECIFICS_PROMPT;
  }
}
