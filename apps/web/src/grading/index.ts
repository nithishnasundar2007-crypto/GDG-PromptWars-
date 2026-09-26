// Owner: Suchit. The ONLY import path other domains (engine/session,
// lib/api, screens) may use into grading/. Internals (runner, ai, prompts,
// quote, pipeline, project, transcribe) are not imported directly from
// outside this folder — and grading/ai's provider adapter is the only code
// anywhere that talks to the ai-proxy.

export { initRunner, runSample, runCode, verifyRunnerLoads, type RunnerLoadStatus } from "./runner";
export { gradeStep, explain } from "./pipeline";
export { matchQuote, normalise } from "./quote";
export { generateProjectQuestions, gradeProjectAnswer } from "./project";
export { transcribe } from "./transcribe";
export { AIService, getAiCallLogs } from "./ai";
export { PROMPT_REGISTRY, type PromptId } from "./prompts";
export { configureGrading, type GradingDeps } from "./deps";
export { GradingError } from "./errors";
export { runEval } from "./eval";
export type { EvalReport, LabelledAnswer } from "./eval";
