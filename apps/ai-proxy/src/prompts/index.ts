// PRD F9/F10/F12 — barrel for the real, versioned prompt templates. Each
// module exports id/version/temperature/systemInstruction/responseSchema
// plus a build(input) that renders the user-content string. This is the only
// place prompt wording lives — apps/web/src/grading/prompts/registry.ts is
// documentation-only metadata for the frontend, kept in sync by hand (see
// docs/CONFLICTS.md).

import * as grader from "./grader.v1.js";
import * as verifier from "./verifier.v1.js";
import * as explainer from "./explainer.v1.js";
import * as projectQuestions from "./project-questions.v1.js";
import * as transcribe from "./transcribe.v1.js";

export type PromptId = "grader" | "verifier" | "explainer" | "project-question-generator" | "transcribe";

export function isPromptId(value: unknown): value is PromptId {
  return value === "grader" || value === "verifier" || value === "explainer" || value === "project-question-generator" || value === "transcribe";
}

interface PromptDef {
  version: string;
  temperature: number;
  systemInstruction: string;
  responseSchema: object;
  build: (input: unknown) => string;
}

export const PROMPTS: Record<PromptId, PromptDef> = {
  grader: {
    version: grader.version,
    temperature: grader.temperature,
    systemInstruction: grader.systemInstruction,
    responseSchema: grader.responseSchema,
    build: grader.build as PromptDef["build"],
  },
  verifier: {
    version: verifier.version,
    temperature: verifier.temperature,
    systemInstruction: verifier.systemInstruction,
    responseSchema: verifier.responseSchema,
    build: verifier.build as PromptDef["build"],
  },
  explainer: {
    version: explainer.version,
    temperature: explainer.temperature,
    systemInstruction: explainer.systemInstruction,
    responseSchema: explainer.responseSchema,
    build: explainer.build as PromptDef["build"],
  },
  "project-question-generator": {
    version: projectQuestions.version,
    temperature: projectQuestions.temperature,
    systemInstruction: projectQuestions.systemInstruction,
    responseSchema: projectQuestions.responseSchema,
    build: projectQuestions.build as PromptDef["build"],
  },
  transcribe: {
    version: transcribe.version,
    temperature: transcribe.temperature,
    systemInstruction: transcribe.systemInstruction,
    responseSchema: transcribe.responseSchema,
    build: () => "", // audio is sent as inline data, not through build()
  },
};
