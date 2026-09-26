// Owner: Suchit. One entry per prompt, versioned. Grader and Verifier run at
// temperature 0 (PRD §7.2, §9 rules). Each entry's `sees`/`mustNotSee` is
// documentation of the API Contract §4 table, enforced by the function
// signatures in pipeline/index.ts (e.g. verify() only accepts one
// RubricPoint + its spans — it has no parameter to smuggle the rest of the
// answer through).

export type PromptId = "grader" | "verifier" | "explainer" | "project-question-generator";

export interface PromptSpec {
  id: PromptId;
  version: string;
  temperature: number;
  sees: string;
  mustNotSee: string;
}

export const PROMPT_REGISTRY: Record<PromptId, PromptSpec> = {
  grader: {
    id: "grader",
    version: "1.0.0",
    temperature: 0,
    sees: "Question, step, rubric points, the answer",
    mustNotSee: "The expected answer or model outline",
  },
  verifier: {
    id: "verifier",
    version: "1.0.0",
    temperature: 0,
    sees: "One rubric point and its spans only",
    mustNotSee: "The rest of the answer, the question, other points",
  },
  explainer: {
    id: "explainer",
    version: "1.0.0",
    temperature: 0.3,
    sees: "Question, step, answer, failed points or failing test",
    mustNotSee: "Nothing restricted",
  },
  "project-question-generator": {
    id: "project-question-generator",
    version: "1.0.0",
    temperature: 0.3,
    sees: "Pasted project text",
    mustNotSee: "Nothing restricted",
  },
};
