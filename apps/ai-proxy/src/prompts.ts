// Owner: Suchit. System-prompt TEXT for each prompt id — the proxy is a
// dumb "validate origin -> build this prompt -> call Gemini -> return JSON"
// box (docs/PHASE0_AUDIT.md section J); it doesn't know about Compass domain
// types beyond what's needed to build the prompt string.
//
// M0 scaffold: routing + a placeholder instruction per id, so the pipeline
// end-to-end is wireable. The actual prompt wording (matching API Contract
// §4's exact output shapes, Grader-never-sees-model-answer, Verifier-sees-
// only-one-point, temperature 0, etc.) is Suchit's M1 work.

export type PromptId = "grader" | "verifier" | "explainer" | "project-question-generator";

export function isPromptId(value: unknown): value is PromptId {
  return value === "grader" || value === "verifier" || value === "explainer" || value === "project-question-generator";
}

interface PromptDef {
  temperature: number;
  systemInstruction: string;
  responseSchema: object;
}

// TODO(Suchit, M1): replace each systemInstruction with the real prompt text
// and responseSchema with Gemini's JSON-schema output config, matching
// API Contract §4 exactly (Grader/Verifier at temperature 0; Grader never
// sees the expected answer; Verifier sees only one point + its spans).
export const PROMPTS: Record<PromptId, PromptDef> = {
  grader: {
    temperature: 0,
    systemInstruction:
      "You are the Grader. For each rubric point, return spans (exact quotes) from the student's answer that address it. Never see or infer a model answer. TODO(Suchit): finalize wording.",
    responseSchema: { type: "object", properties: { points: { type: "array" } } },
  },
  verifier: {
    temperature: 0,
    systemInstruction:
      "You are the Verifier. You see exactly one rubric point and its spans, nothing else. Answer yes only if the spans together fully satisfy the point; default to no. TODO(Suchit): finalize wording.",
    responseSchema: { type: "object", properties: { pointId: { type: "string" }, satisfied: { type: "boolean" }, reason: { type: "string" } } },
  },
  explainer: {
    temperature: 0.3,
    systemInstruction:
      "You are the Explainer. Given the question, step, answer, and what failed, write four-part feedback: whatHappened, whyWrong, missing, nextDrill. Never grade grammar or spelling. TODO(Suchit): finalize wording.",
    responseSchema: { type: "object", properties: { whatHappened: { type: "string" }, whyWrong: { type: "string" }, missing: { type: "string" }, nextDrill: { type: "string" } } },
  },
  "project-question-generator": {
    temperature: 0.3,
    systemInstruction:
      "Given a pasted project description, write 6-8 interviewer-style questions across architecture, trade-offs, failure-scaling and contribution, each referencing specific details from the text. TODO(Suchit): finalize wording.",
    responseSchema: { type: "object", properties: { questions: { type: "array" } } },
  },
};
