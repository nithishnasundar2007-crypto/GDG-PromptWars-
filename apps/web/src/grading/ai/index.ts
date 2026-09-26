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

async function callAiProxy(promptId: PromptId, input: unknown): Promise<unknown> {
  const response = await fetch(`${config.aiProxyUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptId, input }),
  });
  if (!response.ok) {
    throw new Error(`ai-proxy responded ${response.status}`);
  }
  return response.json();
}

/**
 * Calls the given prompt through the proxy, validates the JSON result against
 * `schema`, and retries once on any failure (network or schema mismatch)
 * before giving up with a typed ApiError. Never throws to the caller.
 */
export async function generate<T>(
  promptId: PromptId,
  input: unknown,
  schema: z.ZodType<T>,
): Promise<Result<T>> {
  const start = Date.now();
  let retries = 0;
  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) retries += 1;
    try {
      const raw = await callAiProxy(promptId, input);
      const parsed = schema.safeParse(raw);
      if (parsed.success) {
        logs.push({ promptId, latencyMs: Date.now() - start, retries, outcome: "ok" });
        return ok(parsed.data);
      }
      lastError = { code: "GEMINI_BAD_JSON", message: parsed.error.message, retryable: true };
    } catch (e) {
      lastError = {
        code: "GEMINI_FAILED",
        message: e instanceof Error ? e.message : "Gemini call failed",
        retryable: true,
      };
    }
  }

  logs.push({
    promptId,
    latencyMs: Date.now() - start,
    retries,
    outcome: lastError?.code === "GEMINI_BAD_JSON" ? "bad_json" : "failed",
  });
  return err(lastError!.code, lastError!.message);
}

export const AIService = { generate };
