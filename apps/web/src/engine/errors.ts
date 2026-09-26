// Engine errors carry an API Contract §5.1 code so lib/api can return the
// right Result<T> failure instead of collapsing everything to one code.

import type { ErrorCode } from "../contracts";

const ERROR_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  "RUNNER_NOT_READY",
  "RUN_TIMEOUT",
  "GEMINI_FAILED",
  "GEMINI_BAD_JSON",
  "INVALID_STEP",
  "NOT_FOUND",
  "CONTRACT_MISMATCH",
]);

export class EngineError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}

/** Maps anything thrown by engine or grading code to an API Contract error code. */
export function errorCodeOf(e: unknown, fallback: ErrorCode): ErrorCode {
  if (e instanceof EngineError) return e.code;
  if (e instanceof Error) {
    if (e.name === "NotImplementedError") return "RUNNER_NOT_READY";
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && ERROR_CODES.has(code)) return code as ErrorCode;
  }
  return fallback;
}
