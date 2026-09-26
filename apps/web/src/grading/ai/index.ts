// Owner: Suchit. AIService — the ONLY place in the app that reaches out to
// the ai-proxy (and therefore, transitively, Gemini). No other module may
// import this file's `callAiProxy`; everything else goes through
// grading/pipeline, grading/project or grading/transcribe, which call
// AIService.generate().
//
// GEMINI_API_KEY never appears here — it lives only in apps/ai-proxy's
// environment (docs/PHASE0_AUDIT.md section I, conflict 1 / section J).

import type { z } from "zod";
import { config } from "../../config";
import type { ApiError, Result } from "../../contracts";
import { err, ok } from "../../contracts/errors";
import type { PromptId } from "../prompts";
import { AI_RETRY_BASE_DELAY_MS, AI_RETRY_JITTER_MS, AI_TIMEOUT_MS } from "../config";

interface AiCallLog {
  promptId: PromptId;
  latencyMs: number;
  retries: number;
  outcome: "ok" | "bad_json" | "failed";
}

const logs: AiCallLog[] = [];

export function getAiCallLogs(): readonly AiCallLog[] {
  return logs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Jittered backoff delay for the single retry (hard rule §3.3). */
function retryDelayMs(): number {
  return AI_RETRY_BASE_DELAY_MS + Math.random() * AI_RETRY_JITTER_MS;
}

// Maps each client-side PromptId to its fixed /v1/* route (API Contract
// §7.5 / hard rule §3.2 — "fixed /v1/* operations only, never an open
// relay"). The request body IS the prompt's input, not a wrapper envelope —
// the proxy's own zod schemas (apps/ai-proxy/src/schemas.ts) validate it.
const PROMPT_ROUTES: Record<PromptId, string> = {
  grader: "/v1/grade",
  verifier: "/v1/verify",
  explainer: "/v1/explain",
  "project-question-generator": "/v1/project-questions",
};

async function callAiProxy(promptId: PromptId, input: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.aiProxyUrl}${PROMPT_ROUTES[promptId]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`ai-proxy responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Calls the given prompt through the proxy, validates the JSON result against
 * `schema`, and retries once (after a jittered backoff) on any failure
 * (network, timeout, or schema mismatch) before giving up with a typed
 * ApiError. Never throws to the caller — a grade is either produced or
 * refused, never guessed at (docs/PHASE0_AUDIT.md section J).
 *
 * @param promptId which versioned prompt to call (see grading/prompts/registry.ts)
 * @param input the (unvalidated-here) request payload; the proxy validates it
 * @param schema zod schema the proxy's JSON response must satisfy
 */
export async function generate<T>(
  promptId: PromptId,
  input: unknown,
  schema: z.ZodType<T>,
): Promise<Result<T>> {
  const start = Date.now();
  let retries = 0;
  // Always a real ApiError (never undefined) so the final `return err(...)`
  // below needs no non-null assertion — both loop branches below overwrite
  // this on every iteration, this is just a safe starting value for TS.
  let lastError: ApiError = { code: "GEMINI_FAILED", message: "Gemini call failed", retryable: true };

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      retries += 1;
      await sleep(retryDelayMs());
    }
    try {
      const raw = await callAiProxy(promptId, input);
      const parsed = schema.safeParse(raw);
      if (parsed.success) {
        logs.push({ promptId, latencyMs: Date.now() - start, retries, outcome: "ok" });
        return ok(parsed.data);
      }
      lastError = { code: "GEMINI_BAD_JSON", message: parsed.error.message, retryable: true };
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "AbortError";
      lastError = {
        code: "GEMINI_FAILED",
        message: isTimeout ? `Gemini call timed out after ${AI_TIMEOUT_MS}ms` : e instanceof Error ? e.message : "Gemini call failed",
        retryable: true,
      };
    }
  }

  logs.push({
    promptId,
    latencyMs: Date.now() - start,
    retries,
    outcome: lastError.code === "GEMINI_BAD_JSON" ? "bad_json" : "failed",
  });
  return err(lastError.code, lastError.message);
}

export const AIService = { generate };
