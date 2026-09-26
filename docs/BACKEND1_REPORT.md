# Backend 1 (Grading & AI) — final report

## 1. Runner spike result

See `docs/RUNNER_SPIKE.md` for the full write-up. Summary: `npm run build -w
web` succeeds, bundles the runner Worker into its own chunk, and
`vite-plugin-static-copy` copies 14 files from the pinned `pyodide`/`sql.js`
npm packages into `dist/pyodide/` and `dist/sqljs/` (confirmed by inspecting
real build output). All non-Worker runner logic (input limits, question
lookup, dispatch, output comparison) has real Vitest coverage. What could
**not** be verified end-to-end in this sandbox: actual Pyodide load time,
the `sys.meta_path` import guard actually blocking `import js`, the
`SharedArrayBuffer` interrupt path actually raising `KeyboardInterrupt`, and
the terminate+respawn fallback actually recovering a hung worker — all of
these need a real browser Worker environment, which this sandbox's
Node-based Vitest run cannot provide. The code for every one of these is
implemented for real (not stubbed) and reviewed against Pyodide/sql.js's
documented APIs; it is honestly labeled as unexercised, not claimed as
verified.

## 2. File tree of everything created/changed

**`apps/web/src/grading/`** (rewritten/completed, per ownership):
- `config.ts` — every threshold/limit as a named constant (new)
- `errors.ts` — `GradingError`, the Result-vs-throw adapter boundary (new)
- `deps.ts` (+ `.test.ts`) — `configureGrading`/`getQuestionOrThrow` (new)
- `concurrency.ts` — `mapWithConcurrency`, used for capped Verifier calls (new)
- `quote/normalize.ts`, `quote/match-quote.ts` (+ `index.ts` barrel, `.test.ts`) — full spec rewrite (NFKC, curly quotes, trivial-span rule, token windows, perf budget)
- `pipeline/grade-step.ts`, `code-step.ts`, `rubric-step.ts`, `explain.ts`, `fallback-feedback.ts` (+ `index.ts` barrel, 6 test files) — split from one file, spans-matched-only fix, concurrency-capped Verifier, real deterministic fallback feedback
- `project/generate-questions.ts`, `grade-answer.ts`, `cache.ts` (+ `index.ts` barrel, 2 test files) — session cache by SHA-256, 6-8-question retry, modelOutline from the Explainer
- `runner/messages.ts`, `compare.ts`, `python-host.ts`, `sql-host.ts`, `worker.ts`, `runner-client.ts` (+ rewritten `index.ts`, 2 test files) — real Worker message protocol, sandboxing, timeout/recovery
- `transcribe/index.ts` (+ `.test.ts`) — scope/size/MIME validation, real proxy call
- `ai/index.ts` (+ `.test.ts`) — added `AI_TIMEOUT_MS` hard timeout + jittered retry backoff
- `eval/types.ts`, `metrics.ts`, `run-eval.ts` (+ `.test.ts`), `run-eval.ondemand.eval.ts`, `index.ts` — the eval harness (new)
- `index.ts` — barrel, added `configureGrading`/`GradingError`/`runEval` exports

**`apps/web/src/contracts/`**:
- `CONTRACT.lock` (new) — SHA-256 of `types.ts`
- `contract-freeze.test.ts` (new) — the lock check + `expectTypeOf` checks for every §2 frozen signature

**`apps/web/` config**:
- `vite.config.ts` — pyodide/sql.js static-copy, dev-server COOP/COEP headers, coverage thresholds
- `vitest.eval.config.ts` (new) — separate config so the real 30+-answer eval run stays out of `npm test`/CI
- `tsconfig.app.json` — excludes `*.ondemand.eval.ts` (it uses `node:*` imports)
- `package.json` — added `fastest-levenshtein`, `pyodide`, `sql.js`, `@types/sql.js`, `vite-plugin-static-copy`, `@vitest/coverage-v8`; added `coverage`/`eval` scripts

**`apps/ai-proxy/src/`** (restructured, per ownership):
- `app.ts` (new) — Express app builder, split out of `server.ts` for testability
- `server.ts` — now a thin `createApp().listen(...)` entrypoint
- `gemini.ts` (+ `.test.ts`) — `@google/genai` client, `callGemini`/`callGeminiWithAudio` (replaces `@google/generative-ai`)
- `router.ts` (+ `.test.ts`, `.more.test.ts`) — the fixed `/v1/*` surface
- `security.ts` (+ `.test.ts`, `.more.test.ts`) — App Check verification, dev-bypass flag
- `schemas.ts` (new) — zod request-body schemas per route
- `logging.ts` (new) — privacy-safe structured logs
- `prompts/*.v1.ts` (new, 5 files) + `prompts/index.ts` — real, versioned, injection-resistant prompt wording (replaces placeholder `prompts.ts`)
- `config.ts` (+ `.test.ts`) — zod-validated env, new vars
- `rateLimit.ts` (+ `.test.ts`) — reads `RATE_LIMIT_PER_MIN` from config
- `vitest.config.ts` (new), coverage thresholds; `package.json` `test`/`coverage` scripts; `tsconfig.json` adds `exactOptionalPropertyTypes`/`noImplicitOverride`

**Root / cross-cutting**:
- `scripts/check-bundle-key.mjs` — extended to also fail on a literal `AIza`-prefixed string
- `.github/workflows/ci.yml` — additive: coverage gates (both workspaces), `npm audit --audit-level=high`
- `package.json` — `test` now runs both workspaces
- `.env.example` — additive new vars (VITE_AI_TIMEOUT_MS, runner timeouts, App Check site key, RATE_LIMIT_PER_MIN, App Check dev-bypass/project id)
- `.gitignore` — added `coverage/`
- `firebase.json` (new) — Hosting config only, never deployed here
- `eval/labelled-answers/labelled.json` (new) — 32 hand-labelled answers
- `docs/BACKEND1.md`, `docs/RUNNER_SPIKE.md`, `docs/RUNNER_IO.md`, `docs/SECURITY.md`, `docs/CONFLICTS.md`, `docs/BACKEND1_REPORT.md` (this file) — new

**Never touched**: `apps/web/src/engine/**`, `screens/**`, `shell/**`,
`data/**` (except reading the seed question), `lib/api/**` (except reading
it to confirm its call shape).

## 3. Evaluation-criteria scorecard

| Criterion | Evidence |
|---|---|
| **Code Quality** | `tsc -b` (web) and `tsc -p tsconfig.json --noEmit` (ai-proxy) both exit 0 with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` (both packages) and `exactOptionalPropertyTypes` (ai-proxy only — see docs/CONFLICTS.md #7 for why not web). `eslint . --max-warnings 0` (web) exits 0 — zero `any`, zero `@ts-ignore`, zero non-null assertions across everything written this session. Every file starts with a `// PRD F#` or `// PRD §` header comment. Every exported function has a JSDoc comment stating purpose/params/return/error codes (see e.g. `grading/quote/match-quote.ts`, `grading/deps.ts`). Files stay under ~200 lines by construction (pipeline/project/runner were each split into 4-6 single-responsibility files). **Gap, stated plainly**: `apps/web/eslint.config.js` was not upgraded to `typescript-eslint`'s `strict-type-checked` for `grading/**` as this task asked — see docs/CONFLICTS.md #8 for why (risk of a large first-pass finding set with limited time to verify each one is a true positive, not a behavior change). |
| **Security** | Gemini key never in the web bundle — verified with a real `npm run build -w web` + `node scripts/check-bundle-key.mjs` (now also checks the literal `AIza` prefix, not just an exact env-value match). Fixed `/v1/*` surface (no generic relay). Origin allow-list, rate limiting, request-size limits, zod validation on every route — all tested (`router.test.ts`, `router.more.test.ts`, `rateLimit.test.ts`). No stack traces in any response (tested explicitly). Prompt-injection defense-in-depth (delimited untrusted input in every prompt) plus the structural guarantee (quote matcher + Verifier are independent, non-bypassable gates) — tested with adversarial fixtures in `rubric-step.test.ts` and three real adversarial items in the eval set. **App Check**: real `firebase-admin` verification path implemented and unit-tested with `firebase-admin` mocked; **cannot be verified against a real Firebase project in this sandbox** — stated plainly in docs/SECURITY.md, not glossed over. Hidden tests still ship in the client bundle — a known, stated MVP limitation (docs/SECURITY.md), not something this task's scope could fix without a much larger architecture change. |
| **Efficiency** | `initRunner`/`preload` idempotent (single cached promise). sql.js lazy-loaded on first SQL run. One Worker message runs every test for a submission (never per-test). `VERIFIER_CONCURRENCY = 4`-capped parallel Verifier calls, only for points whose quote already matched (tested in `rubric-step.test.ts`). `matchQuote`: O(n) exact check first, bounded fuzzy fallback over token windows — measured `<=5ms` on an 8,000-char answer in a real Vitest perf-budget test (relaxed only under V8 coverage instrumentation, which adds real overhead unrelated to the algorithm; the uninstrumented `npm test` run enforces the real budget). `AI_TIMEOUT_MS = 20000` + one jittered-backoff retry on every Gemini call, tested. `generateProjectQuestions` cached by SHA-256 of normalised project text per session, tested (`cache.test.ts`). Pyodide/sql.js served same-origin from pinned npm packages, not a CDN (verified via real `npm run build` output). SharedArrayBuffer interrupt-then-terminate-and-respawn timeout strategy implemented; **not measurable in this sandbox** (see §1). |
| **Testing** | 123 tests (web) + 31 tests (ai-proxy) = 154 total, all green. Coverage gates configured and met: `grading/quote`, `grading/pipeline`, `grading/ai` at ~100% lines / 83-96% branches (90%+ except quote's documented 80% floor for provably-unreachable defensive branches — docs/CONFLICTS.md #9); everything else under `grading/**` at 85%+ lines; `apps/ai-proxy` at 98.4% lines against an 85% gate. `npm run coverage -w web` and `npm run coverage -w ai-proxy` both exit 0. No test calls the real Gemini API anywhere — every AI-dependent test mocks `fetch` (web) or `@google/genai`/`callGemini` (ai-proxy) and runs the real validation/retry/pipeline code against the mock. Required suites: contract freeze (SHA-256 lock + `expectTypeOf` for every §2 signature), quote matcher (normalization/boundary/Tanglish/trivial-span), rubric pipeline (no-span/unmatched/verifier-no/all-met/optional-miss/no-rubric), runner (mocked, since real execution needs a browser — see §1), AI resilience (bad-JSON-retry, bad-JSON-twice, network-failure-twice, timeout), Explainer fallback (all three branches), prompt injection (adversarial fixture that can't be awarded), and ai-proxy (App Check, origin, rate limit, oversized body, unknown operation, schema-invalid, key-never-echoed) — all present and passing. `runEval` proven correct on a small synthetic set (`run-eval.test.ts`) per hard rule 3.4, separately from the real 30+-answer run. |
| **Accessibility** | Every `Feedback` field (whatHappened/whyWrong/missing/nextDrill) is built either by the real Explainer prompt (which is explicitly instructed: plain text, <=25 words/field, ~8th-grade level, no color/visual references, never comments on grammar/spelling/language-mix) or, on Explainer failure, by a deterministic template (`fallback-feedback.ts`) built only from real failure/point data, in the same plain style — tested directly (`fallback-feedback.test.ts`). Python tracebacks reduced to `"ErrorType on line N: message"` (`python-host.ts`'s `reduceTraceback`) — implemented for real; not verified against a live traceback in this sandbox (see §1), but unit-testable logic (string parsing) with no browser dependency, so a follow-up could add direct tests for it. Every prompt template explicitly states grammar/spelling/language-mix are never grading criteria (`grader.v1.ts`, `verifier.v1.ts`, `explainer.v1.ts`, `project-questions.v1.ts`). |
| **Problem Statement Alignment** | `docs/BACKEND1.md`'s table maps every module to a PRD feature id (F8/F9/F10/F12) and the specific student-facing question it answers. Nothing built outside the PRD — no chatbot, no scoring percentages, no hire prediction. |
| **Google Services Usage** | `@google/genai` (migrated off the deprecated `@google/generative-ai` — docs/CONFLICTS.md #3), JSON-schema structured output (`responseMimeType: "application/json"` + `responseSchema`) on every prompt, Gemini audio understanding wired for `transcribe` via `callGeminiWithAudio`'s `inlineData` content shape. `GEMINI_MODEL` configurable (default `gemini-2.0-flash`). Grader/Verifier at `temperature: 0`; Explainer/project-question-generator at `temperature: 0.3` — all as constants in the prompt modules, matching the frontend's `prompts/registry.ts` metadata. |

No row above says "partially" without naming exactly what's left and why —
see the **Gap**/**cannot be verified**/**known limitation** sentences inline
in each row.

## 4. Evaluation results (mocked AI layer — read this before the numbers)

**These results used a deterministic fixture AI layer, not real Gemini.**
There is no live `GEMINI_API_KEY` in this sandbox. The fixture Grader
returns the literal answer text as a "span" whenever the human label says a
point is satisfied (guaranteeing a quote match) and nothing otherwise; the
fixture Verifier always echoes the human label. This is exactly what this
task's §6 asks for when no real Gemini access exists: it demonstrates the
metric-calculation code and the pipeline's structural guarantees (quote
matcher + Verifier both required, default-to-no) are correct — it is **not**
a measurement of a real Gemini Grader's actual accuracy, and the PRD §8.4
targets should **not** be considered met against real Gemini until re-run
against a live model.

Run via `npx vitest run --config vitest.eval.config.ts` (apps/web), which
graded all 32 items in `eval/labelled-answers/labelled.json` through the
real `gradeRubricStep` pipeline:

| Metric | Target | Result (mocked layer) |
|---|---|---|
| Answers / rubric points | — | 32 / 34 |
| Grader-human agreement | >=85% | 100.0% |
| False-award rate | <=5% | 0.0% |
| False-reject rate | <=10% | 0.0% |
| Confusion (TP/FP/FN/TN) | — | 18 / 0 / 0 / 16 |

Prompt version: `1.0.0` (from `grading/prompts/registry.ts`'s `grader`
entry). Full JSON at `eval/results/1.0.0.json` (gitignored — regenerated,
not source; re-run the command above to reproduce it) and appended as a row
in `eval/REPORT.md`. The labelled set's tag coverage (all exceeding this
task's required minimums, out of 32 total, tags overlap):
recognize+hint 7 (21.9%), explain 11 (34.4%), hr 6 (18.75%), project 8
(25%), vague/restating/adversarial 17 (53%), Tanglish 7 (21.9%). A real
human should re-review these 32 labels before they're trusted as ground
truth for any real accuracy claim — they were written by this session
simulating the labeler role as plausibly and consistently as it could, not
by an actual human rater.

## 5. Contract status

**Zero changes to `apps/web/src/contracts/types.ts` or `errors.ts`.** No
`docs/CONTRACT_CHANGE_REQUEST.md` was needed — the transcribed contract
matched the frozen API Contract source exactly on inspection.

`CONTRACT.lock` SHA-256 (of `types.ts` as it stands after this session, i.e.
unchanged from before this session started):
`c03147332d40f243d425a428b9a05f9a64eeafd53ef2b549e1196bab6e130960`

`apps/web/src/contracts/contract-freeze.test.ts` recomputes this hash and
`expectTypeOf`-checks every function signature this task's §2 froze
(`initRunner`, `runSample`, `runCode`, `generateProjectQuestions`,
`gradeProjectAnswer`, `transcribe`, `gradeStep`, `explain`, `matchQuote`,
`configureGrading`) on every `npm test` run.

## 6. Conflicts log summary

Full detail in `docs/CONFLICTS.md`. Ten entries:

1. **`Result<T>` vs. `lib/api/index.ts`'s existing throw-based call sites** — resolved by adapting at `grading/index.ts`'s export boundary (throw a typed `GradingError`), keeping `Result<T>` internally.
2. **`RubricResult.spans`: raw vs. matched-only** — fixed to matched-only, per this task's explicit §4 instruction (the pre-existing scaffold kept raw spans, a real bug).
3. **`@google/generative-ai` -> `@google/genai`** — internal SDK migration, not a contract change.
4. **CDN -> pinned npm packages for the runner** — `pyodide`/`sql.js` now real dependencies, served same-origin.
5. **Input-limit error code reuse** — no new `ErrorCode` allowed; reused `INVALID_STEP`/`GEMINI_FAILED` per the closest existing meaning and `lib/api`'s existing error mapping.
6. **`configureGrading` / `runSample`'s question lookup** — added the dependency-injection seam; can't be wired into `lib/api/index.ts` itself since `engine/session` doesn't exist yet (see handoff below).
7. **`exactOptionalPropertyTypes`: ai-proxy yes, apps/web no** — turning it on for web surfaces pre-existing violations in `contracts/mocks.ts`, outside this task's ownership; flagged, not silently fixed or silently skipped.
8. **ESLint `strict-type-checked` for `grading/**`** — not attempted, documented as a real gap rather than a silent omission.
9. **Quote matcher's 80% (not 90%) branch floor** — three provably-unreachable defensive branches in `match-quote.ts`.
10. **Eval harness's mocked AI layer** — see §4 above.

## 7. Handoff notes

**To Uthai** (engine/session, seed authoring):
- Wire `configureGrading({ getQuestion: (id) => repo.getQuestion(id) })`
  once at app startup (wherever `engine/session`'s module is constructed),
  before any `runSample` call — otherwise `runSample` throws a
  `NOT_FOUND`-coded `GradingError` with a clear message (not a crash) rather
  than silently succeeding.
- `submitStep` can skip its own separate `runCode` call for code steps —
  `gradeStep` is self-sufficient and already runs the student's code itself
  against the right test list (Apply's own tests, or Transfer's variant
  tests). Calling `runCode` again from `submitStep` would double-run the
  same submission.
- **Seed bank gap**: `docs/RUNNER_IO.md` defines the `TestCase.input`/
  `expected` convention the runner actually executes against (an executable
  Python/SQL snippet + expected stdout, not a description). The existing
  `bfs-shortest-path.json` seed question does **not** follow this
  convention yet (`input` fields are human-readable descriptions) — it will
  need updating before `runCode`/`runSample` can actually grade it for real.

**To Reshma** (frontend/screens):
- Error message shapes: every thrown error from `grading/**`'s public
  functions is a `GradingError` (extends `Error`, adds `.code: ErrorCode`).
  `lib/api/index.ts` (which you own) already catches these into
  `err(code_from_the_catch_site, e.message)` — the `.message` is always a
  short, plain-language, user-safe string (never a raw stack trace or
  internal detail), so it's safe to show directly in `ErrorState` if you
  want the specific message rather than `ApiError`'s default per-code text.
- `RUNNER_NOT_READY` retry behavior: `initRunner()`/`preload()` is
  idempotent — safe to call again after a failure (e.g. from a "Retry"
  button) without worrying about double-loading Pyodide.
- `transcribe` limits: two-week scope only (`config.scope === "two-week"`),
  max 10MB / 3 minutes (estimated from size, not an exact decode), accepted
  MIME types `audio/webm`, `audio/wav`, `audio/mp4`, `audio/mpeg`,
  `audio/ogg`.

**To Shruthi** (hosting/infra):
- Call `initRunner()` from the Setup screen (or as early as reasonable) so
  Pyodide is warm before the student reaches an Apply/Transfer step — it's
  idempotent, so calling it again later is harmless.
- Production COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp`) and a CSP belong in
  `firebase.json` (now created, Hosting section) — **never deployed in this
  sandbox** (no Firebase project/credentials exist here), so treat it as a
  starting point to review, not tested infrastructure. The dev-server
  equivalent (for `npm run dev`) is already wired in `apps/web/vite.config.ts`.
  Both are needed for `SharedArrayBuffer`, which the runner's cooperative
  timeout-interrupt path depends on (see docs/RUNNER_SPIKE.md).
