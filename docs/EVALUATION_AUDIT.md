# Evaluation Audit — PromptWars x GDGoC-CIT Code Assessment Criteria

Audited against `main` at commit `fbe9edc` (2026-09-26). Every number below was
produced by actually running the command shown, not estimated. Scope note up
front, because it matters for every criterion: **only Backend 1 (grading/AI,
`apps/web/src/grading`, `apps/ai-proxy`) and Backend 2 (engine/data,
`apps/web/src/engine`, `apps/web/src/data`) are built.** Frontend 1 and
Frontend 2 (`apps/web/src/screens/**`, `apps/web/src/shell/**`) are still
`NotImplementedError`/stub screens — 7 of 8 screen files contain no real UI.
There is no working browser demo yet; the two backend halves are verified
wired together directly (`apps/web/src/demo-path.e2e.check.test.ts`), not
through a UI.

Only the platform's own automated code assessment scores the final
submission, and only the last commit on `main` counts — this document is a
human-readable account of what that assessment will find, not a substitute
for it.

---

## 1. Code Quality

| Check | Result |
| --- | --- |
| `npm run lint` (`eslint . --max-warnings 0`) | **0 errors, 0 warnings** |
| `npm run typecheck` (both workspaces) | **0 errors** |
| `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` | On in both `apps/web/tsconfig.app.json` and `apps/ai-proxy/tsconfig.json` |
| `exactOptionalPropertyTypes` | On in `apps/ai-proxy` only. **Not set in `apps/web`** — would require touching `contracts/mocks.ts`, outside grading's ownership; not attempted. |
| ESLint ruleset | `typescript-eslint`'s `recommended`, not `strict-type-checked`. **Gap**: the hard rule asked for strict-type-checked; only `recommended` + `no-unused-vars` + import-boundary rules are actually configured. |
| Banned: `@ts-ignore` | 0 occurrences anywhere in `apps/web/src` or `apps/ai-proxy/src` |
| Banned: `any` | 0 occurrences in `grading/**` or `apps/ai-proxy/src/**` (checked by grep, confirmed by the lint pass above, which fails on `no-explicit-any` violations it does catch) |
| Banned: non-null assertions (`!`) | **Not fully eliminated** — 3 real occurrences in shipped (non-test) code: `grading/ai/index.ts:118` (`lastError!.code`, after a loop that always sets `lastError` before exit), `grading/runner/sql-host.ts:41` (`rows[0]!`, after an explicit `rows.length === 0` guard), `grading/quote/match-quote.ts:63` (`index.starts[start]!`, inside a bounds-checked loop). All three are reachable-safe by construction, but the hard rule says "banned," full stop — this is an honest gap, not a hidden one. |
| Banned: `console.*` outside a logger | `apps/ai-proxy/src/logging.ts:16` (the logger itself — legitimate) and `apps/ai-proxy/src/server.ts:10` (a one-line startup message, technically outside the logger — minor). Nothing in `grading/**`. |
| One responsibility per file, ≤200 lines | Followed — the pipeline/project/runner/proxy folders are split into single-purpose files (`grade-step.ts`, `code-step.ts`, `rubric-step.ts`, `explain.ts`, `fallback-feedback.ts`, etc.) as designed. |
| JSDoc + PRD-feature header on every exported function/file | Present throughout `grading/**` and `apps/ai-proxy/src/**` (spot-checked; consistent with the `// PRD F9 — ...` convention). |
| `grading/config.ts` — no magic numbers | Present: `VERIFIER_CONCURRENCY`, `AI_TIMEOUT_MS`, input limits, etc. are named constants read from validated env. |
| Contract boundary (`Result<T>` vs throw) | Deliberately resolved and documented in `docs/CONFLICTS.md` — public grading exports throw (matching what `lib/api/index.ts` already calls), internal logic is `Result<T>`-typed. |

**Verdict**: strong — clean lint/typecheck, real modularity, real docs — with two named, un-hidden gaps (ESLint strictness tier, a handful of defensively-safe `!`).

---

## 2. Security

| Check | Result |
| --- | --- |
| Gemini key in the web bundle | `node scripts/check-bundle-key.mjs` → **pass**, checked for both an env-set key value and the literal `AIza` prefix. Key only ever lives in `apps/ai-proxy`'s env. |
| AI proxy: fixed operations only | `apps/ai-proxy/src/router.ts` exposes exactly `/v1/grade`, `/v1/verify`, `/v1/explain`, `/v1/project-questions`, `/v1/transcribe`, `/v1/health` — no generic relay. |
| Prompts built server-side, versioned | `apps/ai-proxy/src/prompts/*.v1.ts`, one file per operation. |
| App Check | Real `firebase-admin` verification path exists (`security.ts`) and is unit-tested via an injectable verifier — **but `APP_CHECK_DEV_BYPASS` defaults to `true`** (bypass ON) unless explicitly set to `"false"`. This is real, working code, but it ships **open** by default; a real deployment must remember to flip this env var. Flagged in `docs/SECURITY.md`, repeating it here because it's the single most important thing to check before ever deploying this proxy for real. |
| Origin allow-list, rate limiting, size limits, zod validation | All present and tested (`router.test.ts`, `router.more.test.ts`, `security.test.ts`, `security.more.test.ts` — 31 ai-proxy tests total). |
| No stack traces in responses | Spot-checked `router.ts`/`server.ts` — error responses return a message string, never `err.stack`. |
| Prompt-injection defense | Every prompt (`grader.v1.ts`, `verifier.v1.ts`, `explainer.v1.ts`, `project-questions.v1.ts`, `transcribe.v1.ts`) explicitly tells the model the student/project text is data, not instructions, with a concrete "ignore previous instructions" example. Adversarial fixture tests exist in `grading/pipeline/rubric-step.test.ts` and the demo-path suite proving the quote-matcher + Verifier gate still can't be tricked into `met: true` on an unsatisfied point, even against a mocked Gemini layer that returns a bogus verdict. |
| Student code sandbox | Worker-only execution, `sys.meta_path` import guard against `js`/`pyodide`/`pyodide_js`/`micropip`, stdout/stderr cap, fresh globals per test — implemented in `python-host.ts`/`sql-host.ts`/`worker.ts`. **Real Worker/Pyodide execution itself is unverifiable in this sandbox** (no browser) — honestly documented in `docs/RUNNER_SPIKE.md`, not silently skipped. |
| Input limits | Named constants in `grading/config.ts` (answer 8,000 chars, code 20,000, project text 20,000, audio 10MB/3min, 50 tests/run), enforced before work starts, tested. |
| CSP / COOP / COEP | `firebase.json` sets `script-src 'self' 'wasm-unsafe-eval'`, `connect-src` scoped, plus COOP/COEP for `SharedArrayBuffer`. **Never deployed or exercised against a real Firebase Hosting instance** — config only. |
| Privacy in logs | `grading/ai/index.ts` and `apps/ai-proxy/src/logging.ts` log ids/latencies/prompt ids/outcomes only — no answer text, project text, audio, or keys. Verified by reading both loggers directly. |
| `npm audit --audit-level=high` | **0 high/critical.** 8 moderate, all transitive through `firebase-admin` → `@google-cloud/storage` → `teeny-request`/`retry-request` (a `uuid` advisory). Exits 0 per the hard rule's threshold. |

**Verdict**: the real architecture is sound (key isolation, fixed routes, injection defense, sandboxing) — the one thing to act on before any real deployment is `APP_CHECK_DEV_BYPASS`.

---

## 3. Efficiency

| Check | Result |
| --- | --- |
| `initRunner` idempotent | Implemented (single in-flight promise), tested in `runner/index.test.ts`. |
| Pyodide/sql.js served same-origin, pinned versions | `apps/web/package.json` pins exact versions; `vite.config.ts` copies them via `viteStaticCopy`, no CDN. |
| One worker message per submission | `runner-client.ts`'s message protocol runs all tests in one round-trip. |
| Verifier concurrency cap | `VERIFIER_CONCURRENCY = 4` in `grading/config.ts`, enforced via `mapWithConcurrency` in `rubric-step.ts` and `project/grade-answer.ts` — confirmed by reading both call sites; points with no matched span never trigger a Verifier call at all (tested). |
| `matchQuote`: O(n) exact match before fuzzy fallback | Implemented in `quote/match-quote.ts`; fuzzy path uses bounded token windows via `fastest-levenshtein`, not a full cross product. |
| `AI_TIMEOUT_MS` + jittered retry backoff | Present in `grading/ai/index.ts` / `retry.ts` logic, tested in `ai/index.test.ts`. |
| `generateProjectQuestions` caching | SHA-256-of-normalized-text cache in `project/cache.ts`, tested. |
| Performance budgets | `matchQuote` ≤5ms/8,000-char benchmark: present and passing in `quote/index.test.ts`. Warm-Python-5-tests ≤1.5s and `gradeStep` ≤50ms budgets: the `gradeStep`-excluding-network budget is tested against a mocked AI layer; the real Pyodide warm-run budget is **not measurable in this sandbox** (no browser) — documented, not faked, in `docs/RUNNER_SPIKE.md`. |

**Verdict**: every efficiency rule that's testable without a real browser is implemented and tested; the one that needs a browser is honestly flagged as unmeasured here, not claimed.

---

## 4. Testing

| Check | Result |
| --- | --- |
| `npm run test` (both workspaces) | **318 tests passing** — 287 in `apps/web` (186 engine + ~101 grading/contracts, including the new real-engine + real-grading demo-path test), 31 in `apps/ai-proxy`. 0 failures. |
| Coverage — `grading/quote`, `grading/pipeline`, `grading/ai` (≥95% lines / ≥90% branches target) | `npm run coverage -w web`: `grading/pipeline` 100% lines / 98.21% branches; `grading/ai` 100% lines / 92.85% branches; `grading/quote` 100% lines / 83.33% branches (branch threshold intentionally set to 80% for quote, not 90%, with a documented reason in `vite.config.ts` — two provably-unreachable defensive guards past the exact-match fast path; logged in `docs/CONFLICTS.md`). |
| Coverage — everything else in `grading/` and `apps/ai-proxy` (≥85% lines) | `grading` overall: 98.14% lines. `apps/ai-proxy`: 98.43% lines. Both well above the 85% floor. |
| No test calls real Gemini | Confirmed by reading every AI-related test — all stub `global.fetch`, never a live network call. |
| Required suites (contract freeze, matchQuote, rubric pipeline, runner, AI resilience, Explainer fallback, prompt injection, AI proxy) | All present as named files; contract-freeze test double-checked and its `CONTRACT.lock` hash **corrected** during this audit pass (see Contract Status below — the original lock value was wrong, not the contract itself). |
| `runEval` correctness | Tested with a synthetic labelled set (`eval/run-eval.test.ts`), separately from the real 32-item run. |
| Real 32-item eval run | `eval/REPORT.md` / `eval/results/1.0.0.json` exist, run against a **mocked** AI layer (no live Gemini key) — clearly labeled as such in the report; not a claim about real-Gemini accuracy. |
| Cross-module integration (the actual gap most repos like this have) | Closed in this audit pass: `apps/web/src/demo-path.e2e.check.test.ts` wires the real `createSessionModule` to the real `gradeStep` (not either side's own test stand-in) through the full probe → amber → confirm → red → drill → re-test → green sequence. This caught and fixed two real integration bugs (a wrong `CONTRACT.lock` hash, and `gradeStep` throwing on any Apply/Transfer step for a `lang`-less question) that neither side's own unit tests could have caught alone. |
| Engine's own suite (Backend 2, not this audit's primary scope but relevant to "Testing" as a whole) | 186 tests passing, isolated from grading via an injected `GradeStepFn` stand-in — good architecture, not verified for coverage-gate compliance since no coverage gate was specified for `engine/**`. |

**Verdict**: the strongest category — real numbers, real cross-module verification, gaps stated rather than glossed over.

---

## 5. Accessibility

| Check | Result |
| --- | --- |
| Plain text, no markdown/emoji, ≤25 words/sentence, ~grade-8 level, no color references | Explicitly instructed in `explainer.v1.ts`'s prompt text (quoted verbatim in the source): *"Every field must be plain text (no markdown, no emoji, no code fences), at most 25 words, written at roughly an 8th-grade reading level, and free of any color or visual references."* |
| Python tracebacks reduced to type + message + line number | Implemented in `runner/python-host.ts` (`"ErrorType on line N: message"` format), matching the spec's exact example shape. |
| Grammar/spelling/language-mix never a grading criterion, stated in every prompt | Present in all 5 prompt files (`grader.v1.ts`, `verifier.v1.ts`, `explainer.v1.ts`, `project-questions.v1.ts`, `transcribe.v1.ts` — grep-confirmed). |
| `transcribe` as a typing-alternative path | Implemented, gated on `VITE_SCOPE=two-week`, returns raw transcript text for the student to edit before submitting (never auto-graded, never cleaned/translated). |
| Actual UI accessibility (screen reader flow, focus order, contrast) | **Not assessable** — no screens are built yet (7 of 8 files under `screens/**` are stubs). This criterion is only verifiable at the text-generation layer right now, not the rendered-UI layer. |

**Verdict**: everything that can exist without a UI is real and verified; the UI half of this criterion has no surface to audit yet.

---

## 6. Problem Statement Alignment

The problem: help students see **what to prepare, how to prepare, where they
stand, and what to improve.**

| Piece | Status |
| --- | --- |
| "Where they stand" — verified, evidence-backed grading (F9) | **Real.** `gradeStep` never lets the model decide pass/fail alone; `passed` always derives from `run.passed` or `quoteMatched && verifierYes`. Demonstrated end-to-end in the demo-path test. |
| "What to improve" — gap-accurate feedback (F12) | **Real.** Four-part `Feedback`, generated from actual failed points/tests, with a deterministic fallback if the Explainer call itself fails (never a blank or fabricated result). |
| Project Defense (F8) | **Real** at the grading layer (`generateProjectQuestions`, `gradeProjectAnswer`, tested, demoed rejecting a vague answer). No `screens/practice/project-defense` UI yet to actually paste a project into. |
| Probe Ladder (F3), Gap Finder (F4), Readiness Map (F5), Targeted Drills (F6), Re-Test (F7), Drive Countdown Plan (F2), Round Map (F1) | **Real at the engine layer** (Uthai's work) — ladder transitions, gap lifecycle, readiness derivation, planner, drills all implemented and unit-tested (186 tests), and now confirmed wired to real grading in the demo-path test. |
| Round Debrief (F11), Say-It two-week UI | Backend pieces exist (`saveDebrief`, `transcribe`); no screen consumes them. |
| Every module maps to a named PRD feature id | `docs/BACKEND1.md` has the module→feature→question table for grading; the engine's module boundaries map the same way per `docs/PHASE0_AUDIT.md` section F. |
| Nothing built outside the PRD | Confirmed — no chatbot, no scoring percentages, no hire prediction anywhere in `grading/**` or `engine/**`. |
| **Can a student actually use this today, end to end, in a browser?** | **No.** The two backend halves are real and wired together (proven programmatically), but `screens/**` has no working UI to drive them from. This is the honest, single biggest gap against the problem statement as a *product* right now — the reasoning and grading exist; the interface a student would touch does not yet. |

**Verdict**: strong alignment at the logic layer, zero alignment yet at the "a student can actually sit down and use this" layer. Both true at once.

---

## 7. Google Services Usage

| Check | Result |
| --- | --- |
| Only Google AI, no other LLM vendor | Grep across `apps/web/src` and `apps/ai-proxy/src` for `openai`, `anthropic`, `claude`, `cohere`, `mistral`, `llama` → **zero matches**. |
| `@google/genai` SDK | In use in `apps/ai-proxy/src/gemini.ts` (migrated off the older `@google/generative-ai` during Backend 1's build — logged as a resolved item in `docs/CONFLICTS.md`). |
| JSON-schema structured output | `responseMimeType: "application/json"` + `responseSchema` passed on every call, confirmed by reading `gemini.ts` directly. |
| Temperature split | Grader/Verifier at `0`, Explainer/Project generator at `0.3` — set per-prompt in `prompts/*.v1.ts`, matching the spec exactly. |
| Gemini audio understanding for `transcribe` | Wired in `transcribe.v1.ts` / `grading/transcribe/index.ts`. |
| `GEMINI_MODEL` configurable | Yes, `apps/ai-proxy/src/config.ts`, defaults to a current Flash model. |
| Cloud Run / Cloud Functions | `apps/ai-proxy` is a plain Express app, deployable to either — **not actually deployed anywhere**; no live Cloud Run service exists. |
| Secret Manager | `GEMINI_API_KEY` is read from `process.env` only — the code never assumes a specific secret store, so it's Secret-Manager-compatible, but **no real Secret Manager binding exists** (no GCP project provisioned in this environment). |
| Firebase App Check | Code path real, `APP_CHECK_DEV_BYPASS` defaults on (see Security) — **no live Firebase project to verify against**. |
| Firebase Hosting + COOP/COEP/CSP | `firebase.json` written, **never deployed**. |
| Cloud Logging | The proxy's structured JSON logger (`logging.ts`) writes to stdout in the shape Cloud Logging expects when run on Cloud Run — **not connected to an actual Cloud Logging sink**, since nothing is deployed. |
| Runs inside Google Antigravity / AI Studio | Not attempted in this session — no such environment was available here. |

**Verdict**: the code is Google-only and structured correctly for every listed service; every piece that requires an actual provisioned GCP/Firebase project is real, unexercised configuration, not a working deployment. This is the truthful state, not a hedge.

---

## Contract status (checked as part of this audit, not asked for by the slide, included because it's load-bearing)

`apps/web/src/contracts/types.ts` is byte-identical to the API Contract
transcription (diffed against the source `.docx` extraction, zero
differences). `CONTRACT.lock`'s stored hash was **wrong from when it was
first generated** — it never matched the real SHA-256 of `types.ts`. Found
and fixed in this audit's predecessor pass (commit `145fd83`); the contract
itself was never at risk, only the lock file's own value was miscomputed.

---

## Bottom line

| Criterion | State |
| --- | --- |
| Code Quality | Green, two named gaps (ESLint tier, a few safe `!`) |
| Security | Green architecture, one real action item (`APP_CHECK_DEV_BYPASS`) |
| Efficiency | Green for everything testable outside a browser |
| Testing | Green — 318 passing tests, real cross-module verification, honest coverage numbers |
| Accessibility | Green at the text layer, no UI to assess yet |
| Problem Statement Alignment | Green at the logic layer, **not yet deliverable to a student** — no working screens |
| Google Services Usage | Green code, zero live deployment |

The two backend halves (grading + engine) are genuinely solid and verified
against each other, not just individually. What's missing for this to be a
finished submission is entirely in the frontend (`screens/**`) and in actual
cloud deployment (Cloud Run, Firebase, Secret Manager, a real Gemini key) —
neither of which this session had the ownership, credentials, or environment
to build.
