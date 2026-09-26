// API Contract section 5.1 — error codes, when they fire, and whether the UI
// should offer a retry. The table itself is the source of truth; this file
// only turns it into typed helpers so callers don't hand-roll ApiError shapes.

import type { ApiError, ErrorCode, Result } from "./types";

interface ErrorSpec {
  retryable: boolean;
  defaultMessage: string;
}

const ERROR_SPECS: Record<ErrorCode, ErrorSpec> = {
  RUNNER_NOT_READY: {
    retryable: true,
    defaultMessage: "Getting the code runner ready…",
  },
  RUN_TIMEOUT: {
    // Not surfaced as an API error in the UI — the caller turns this into a
    // failed TestResult with timedOut: true instead of showing ErrorState.
    retryable: false,
    defaultMessage: "Your code ran past the time limit.",
  },
  GEMINI_FAILED: {
    retryable: true,
    defaultMessage: "Grading failed, try again.",
  },
  GEMINI_BAD_JSON: {
    retryable: true,
    defaultMessage: "Grading failed, try again.",
  },
  INVALID_STEP: {
    retryable: false,
    defaultMessage: "That step was submitted out of order.",
  },
  NOT_FOUND: {
    retryable: false,
    defaultMessage: "We couldn't find that.",
  },
  CONTRACT_MISMATCH: {
    retryable: false,
    defaultMessage: "Frontend and backend contract versions differ.",
  },
};

export function apiError(code: ErrorCode, message?: string): ApiError {
  const spec = ERROR_SPECS[code];
  return {
    code,
    message: message ?? spec.defaultMessage,
    retryable: spec.retryable,
  };
}

export function err<T>(code: ErrorCode, message?: string): Result<T> {
  return { ok: false, error: apiError(code, message) };
}

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}
