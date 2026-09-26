// PRD F9/F12 — Proof-Based Grading & Clear Feedback: named constants for every
// grading-side threshold, timeout and limit (hard rule §3.1 "no magic
// numbers"). Values are read from `import.meta.env` where the PRD/spec marks
// them configurable, and fall back to the documented default otherwise.
//
// This file has no I/O beyond reading already-loaded env vars — it is a pure
// lookup table, never a place to add behavior.

function readNumberEnv(name: string, fallback: number): number {
  const raw = (import.meta.env as Record<string, string | undefined>)[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Quote-matcher similarity threshold (API Contract §3.2, PRD §7.2). */
export const QUOTE_SIMILARITY_THRESHOLD = 0.9;

/** Spans this short or shorter must match exactly — no fuzzy credit for trivial spans. */
export const QUOTE_MIN_FUZZY_WORDS = 3;
export const QUOTE_MIN_FUZZY_CHARS = 12;

/** Token-count window multipliers the fuzzy matcher slides across the answer. */
export const QUOTE_WINDOW_MIN_RATIO = 0.8;
export const QUOTE_WINDOW_MAX_RATIO = 1.2;

/** Max number of Verifier calls in flight at once (hard rule §3.3). */
export const VERIFIER_CONCURRENCY = 4;

/** Hard timeout for a single Gemini call through the proxy, in ms. */
export const AI_TIMEOUT_MS = readNumberEnv("VITE_AI_TIMEOUT_MS", 20_000);

/** Base delay for the single jittered retry after an AI call failure, in ms. */
export const AI_RETRY_BASE_DELAY_MS = 300;
export const AI_RETRY_JITTER_MS = 200;

/** Input limits (hard rule §3.2) — enforced before any grading work starts. */
export const MAX_ANSWER_CHARS = 8_000;
export const MAX_CODE_CHARS = 20_000;
export const MAX_PROJECT_TEXT_CHARS = 20_000;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SEC = 3 * 60;
export const MAX_TESTS_PER_RUN = 50;

/** Runner timeouts (hard rule §3.3), configurable per deployment. */
export const RUNNER_TEST_TIMEOUT_MS = readNumberEnv("VITE_RUNNER_TEST_TIMEOUT_MS", 2_000);
export const RUNNER_TOTAL_TIMEOUT_MS = readNumberEnv("VITE_RUNNER_TOTAL_TIMEOUT_MS", 10_000);

/** Cap on captured stdout/stderr per run, in bytes (hard rule §3.2). */
export const RUNNER_OUTPUT_CAP_BYTES = 64 * 1024;
