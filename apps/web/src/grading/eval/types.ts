// PRD §8.4 — Eval harness types (Task 9). Live in grading/eval/, NOT in
// contracts/ — this shape is internal to the eval harness, not part of the
// frozen API contract between frontend and backend.

import type { AnyStep, RubricPoint } from "../../contracts";

export interface LabelledAnswer {
  id: string;
  question: string;
  step: AnyStep;
  /** The rubric this answer is graded against — needed to actually run gradeRubricStep. */
  rubric: RubricPoint[];
  answer: string;
  /** Human label per rubric point id: true = the point is genuinely satisfied. */
  humanPointLabels: Record<string, boolean>;
  humanStepPass: boolean;
  /** Coverage tags (recognize/hint, explain, hr, project, vague, adversarial, tanglish, ...) — may overlap. */
  tags: string[];
}

export interface ConfusionCounts {
  truePositive: number; // system met=true, human=true
  falsePositive: number; // system met=true, human=false (a false award)
  falseNegative: number; // system met=false, human=true (a false reject)
  trueNegative: number; // system met=false, human=false
}

export interface EvalReport {
  promptVersion: string;
  totalAnswers: number;
  totalPoints: number;
  confusion: ConfusionCounts;
  /** (TP + TN) / total — how often the system's met/not-met agrees with the human label. */
  agreementRate: number;
  /** FP / (FP + TN) — how often the system awards a point a human says isn't satisfied. */
  falseAwardRate: number;
  /** FN / (FN + TP) — how often the system rejects a point a human says IS satisfied. */
  falseRejectRate: number;
  /** true when this run used a mocked/deterministic AI layer rather than live Gemini (see docs/BACKEND1_REPORT.md). */
  mockedAiLayer: boolean;
}
