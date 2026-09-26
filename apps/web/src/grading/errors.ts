// PRD F9 — Proof-Based Grading: the throw-adapter boundary described in
// docs/CONFLICTS.md ("Result<T> vs. throw at grading's export boundary").
// grading/index.ts's exported functions match `apps/web/src/lib/api/index.ts`'s
// existing call sites, which expect a thrown Error, not a `Result<T>` —
// GradingError is that thrown Error, carrying a typed ErrorCode so a caller
// that DOES want to inspect it (tests, future callers) still can.

import type { ErrorCode } from "../contracts";

export class GradingError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "GradingError";
    this.code = code;
  }
}
