// Compass shared contract — API Contract tab, section 2, transcribed verbatim.
// No one changes this file without bumping CONTRACT_VERSION and getting
// one backend + one frontend approval (see CONTRIBUTING.md).

export const CONTRACT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// 2.1 Basic enums
// ---------------------------------------------------------------------------

export type Track = "technical" | "hr";
export type StepId = "recognize" | "hint" | "apply" | "explain" | "transfer";
export type HrStepId = "structure" | "specifics" | "followup";
export type AnyStep = StepId | HrStepId;
export type Lang = "python" | "sql";
export type QuestionRole = "probe" | "confirm" | "retest";
export type GapType =
  | "concept"
  | "recall"
  | "coding"
  | "explaining"
  | "adapting"
  | "speed"
  | "structure"
  | "vague"
  | "followup";
export type GapStatus = "suspected" | "confirmed" | "fixed";
export type CellState = "green" | "amber" | "red" | "grey";
export type Scope = "sprint" | "two-week";

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface ApiError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

// Section 5.1 — error codes.
export type ErrorCode =
  | "RUNNER_NOT_READY"
  | "RUN_TIMEOUT"
  | "GEMINI_FAILED"
  | "GEMINI_BAD_JSON"
  | "INVALID_STEP"
  | "NOT_FOUND"
  | "CONTRACT_MISMATCH";

// ---------------------------------------------------------------------------
// 2.2 Setup and content
// ---------------------------------------------------------------------------

export interface Company {
  id: string;
  name: string;
  rounds: Round[];
}

export interface Round {
  id: string;
  name: string;
  order: number;
  topics: { topicId: string; weight: number }[]; // weight 1-5
}

export interface Topic {
  id: string;
  name: string;
  track: Track;
  area: "dsa" | "dbms" | "os" | "oop" | "hr" | "aptitude" | "project";
}

export interface Student {
  id: string;
  name: string;
  companyId: string;
  driveDate: string;
  hoursPerDay: number;
  scope: Scope;
}

export interface RubricPoint {
  id: string;
  text: string;
  required: boolean;
}

export interface TestCase {
  id: string;
  input: string;
  expected: string;
  hidden: boolean;
}

export interface Question {
  id: string;
  topicId: string;
  track: Track;
  role: QuestionRole;
  prompt: string;
  lang?: Lang; // technical coding questions only
  starterCode?: string;
  hint?: string;
  rubrics: Partial<Record<AnyStep, RubricPoint[]>>;
  tests?: TestCase[]; // Apply step
  variant?: { prompt: string; starterCode?: string; tests: TestCase[] }; // Transfer step
  targetTimeMs: Partial<Record<AnyStep, number>>;
  followUp?: string; // Explain or HR follow-up question
}

// ---------------------------------------------------------------------------
// 2.3 Running and grading
// ---------------------------------------------------------------------------

export interface TestResult {
  testId: string;
  passed: boolean;
  timedOut: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  error?: string; // filled for visible tests and the first hidden failure only
}

export interface RunResult {
  passed: boolean;
  results: TestResult[];
  runtimeMs: number;
  firstFailure?: TestResult;
}

export interface RubricResult {
  pointId: string;
  spans: string[]; // quotes returned by the Grader
  quoteMatched: boolean; // every span found by the quote matcher
  verifierYes: boolean; // Verifier verdict
  met: boolean; // quoteMatched && verifierYes
}

export interface Feedback {
  whatHappened: string;
  whyWrong: string;
  missing: string;
  nextDrill: string;
}

export interface GradeResult {
  step: AnyStep;
  passed: boolean;
  run?: RunResult; // Apply and Transfer
  rubric?: RubricResult[]; // open-ended steps
  feedback?: Feedback; // present when passed is false
}

// ---------------------------------------------------------------------------
// 2.4 Ladder, attempts and gaps
// ---------------------------------------------------------------------------

export interface StepOutcome {
  passed: boolean;
  assisted: boolean;
  timeMs: number;
  attemptId: string;
}

export interface LadderState {
  id: string;
  studentId: string;
  questionId: string;
  track: Track;
  current: AnyStep | "done";
  assisted: boolean; // true once the approach was revealed
  outcomes: Partial<Record<AnyStep, StepOutcome>>;
  startedAt: string;
}

export interface Attempt {
  id: string;
  studentId: string;
  questionId: string;
  ladderId: string;
  step: AnyStep;
  answer: string;
  grade: GradeResult;
  assisted: boolean;
  timeMs: number;
  createdAt: string;
}

export interface Gap {
  id: string;
  studentId: string;
  topicId: string;
  step: AnyStep;
  type: GapType;
  status: GapStatus;
  attemptIds: string[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 2.5 Readiness, plan and drills
// ---------------------------------------------------------------------------

export interface ReadinessCell {
  topicId: string;
  step: AnyStep;
  state: CellState;
  attemptIds: string[];
}

export interface ReadinessRow<S extends AnyStep> {
  topic: Topic;
  weight: number;
  cells: Record<S, ReadinessCell>;
}

// Technical columns fold "hint" into "recognize" — see docs/PHASE0_AUDIT.md
// section I, conflict 2, for why (flagged for team sign-off; PRD says 5
// columns, this contract and the UI/UX spec both build against 4).
export interface ReadinessMap {
  companyId: string;
  technical: ReadinessRow<Exclude<StepId, "hint">>[];
  hr: ReadinessRow<HrStepId>[];
}

export interface CellEvidence {
  cell: ReadinessCell;
  attempts: (Attempt & { question: Question })[];
}

export interface PlanItem {
  id: string;
  date: string;
  topicId: string;
  kind: "probe" | "confirm" | "drill" | "retest" | "mock";
  step?: AnyStep;
  gapId?: string;
  gapType?: GapType;
  minutes: number;
  status: "todo" | "done" | "skipped";
}

export interface Plan {
  studentId: string;
  driveDate: string;
  hoursPerDay: number;
  days: { date: string; items: PlanItem[] }[];
}

export interface Drill {
  id: string;
  gapId: string;
  topicId: string;
  gapType: GapType;
  kind: "explainer" | "flashcards" | "debug" | "reexplain" | "variants" | "timed";
  title: string;
  content: string;
  minutes: number;
  questionIds?: string[]; // debug, variants and timed drills
}

// ---------------------------------------------------------------------------
// 2.6 Project Defense and Debrief
// ---------------------------------------------------------------------------

export interface ProjectQuestion {
  id: string;
  area: "architecture" | "tradeoffs" | "failure-scaling" | "contribution";
  text: string;
  rubric: RubricPoint[];
}

export interface ProjectCardItem {
  questionId: string;
  strong: boolean;
  missing: string[];
  modelOutline?: string;
}

export interface Debrief {
  // two-week scope
  id: string;
  studentId: string;
  companyId: string;
  roundName: string;
  date: string;
  items: { question: string; answer: string }[];
  gapIds: string[];
}

// ---------------------------------------------------------------------------
// 3.1 SubmitResult — returned by submitStep
// ---------------------------------------------------------------------------

export interface SubmitResult {
  grade: GradeResult; // what happened on this step
  ladder: LadderState; // updated; ladder.current is the next step or "done"
  nextQuestionText?: string; // prompt to show for the next step (hint, follow-up or variant)
  revealedApproach?: string; // set when step 2 fails and the approach is shown
  gapsChanged: Gap[]; // gaps created, confirmed or fixed by this step
  cellsChanged: ReadinessCell[];
}

// ---------------------------------------------------------------------------
// 4. Gemini prompt output schemas (raw shapes; validated with zod in grading/ai)
// ---------------------------------------------------------------------------

export interface GraderOutput {
  points: { pointId: string; spans: string[] }[];
}

export interface VerifierOutput {
  pointId: string;
  satisfied: boolean;
  reason: string;
}

export type ExplainerOutput = Feedback;

export interface ProjectQuestionGeneratorOutput {
  questions: {
    area: ProjectQuestion["area"];
    text: string;
    rubric: { text: string; required: boolean }[];
  }[];
}
