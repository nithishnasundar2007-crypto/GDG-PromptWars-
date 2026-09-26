# Compass — API Contract (mirrors the API Contract doc tab)

The literal source of truth is `apps/web/src/contracts/types.ts` and `api.ts`
— this file explains and cross-references it; it doesn't restate every type.

- `CONTRACT_VERSION = "1.0.0"` (bump on any change to `contracts/`, with one
  backend + one frontend approval — see `CONTRIBUTING.md`).
- Every function returns `Result<T>` — `{ ok: true, data: T }` or
  `{ ok: false, error: ApiError }`. Nothing throws to the UI.
- Ids are prefixed strings: `co_`, `tp_`, `q_`, `ld_`, `att_`, `gap_`, `pi_`,
  `pq_`.
- Dates: `YYYY-MM-DD`; timestamps: ISO 8601; durations: milliseconds.

## Future HTTP mapping

For the MVP every "API" is an async TypeScript function running in-process
in the browser (`apps/web/src/lib/api`). If the engine/grading modules move
behind an HTTP API later, each function in `contracts/api.ts` becomes:

```
POST /api/v1/<functionName>
Body: the function's arguments, as a JSON object keyed by parameter name
Response: the same Result<T> shape, as JSON
```

Example: `submitStep(ladderId, answer, timeMs)` becomes:

```
POST /api/v1/submitStep
{ "ladderId": "ld_1", "answer": "...", "timeMs": 42000 }
→ { "ok": true, "data": { ...SubmitResult } }
```

No caller-visible change would be needed beyond swapping `lib/api`'s
in-process call for a `fetch` — the contract types are identical either way.

## submitStep's orchestration order (§3.3)

Implemented in `engine/session` (`docs/ARCHITECTURE.md`'s call-flow diagram):

1. Load the ladder and question; reject if the step is out of order
   (`INVALID_STEP`).
2. Apply/Transfer: call `grading.runCode` with the hidden tests.
3. Call `grading.gradeStep` (code steps wrap the `RunResult`).
4. Save the `Attempt`, then call `engine.nextStep`.
5. Call `engine.updateGaps`: create, confirm, or fix.
6. Recompute changed Readiness cells, call `engine`'s `replan`.
7. Return `SubmitResult`.

## Error codes (§5.1)

See `apps/web/src/contracts/errors.ts` — `apiError()` centralises the
message/retryable pairing per code so callers don't hand-roll `ApiError`.

## Gemini prompt schemas (§4)

See `apps/web/src/grading/ai/schemas.ts` (zod) and
`apps/web/src/grading/prompts/registry.ts` (temperature, sees/mustNotSee per
prompt). The ai-proxy's `src/prompts.ts` holds the actual system-instruction
text sent to Gemini — currently placeholders, Suchit's M1 work.
