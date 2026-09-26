# Compass — Phase 0: Audit, Architecture and Migration Plan

Produced before any restructuring, per the migration rules in the Team Plan and the
architect brief. Sections match the requested A–S deliverable list.

---

## A. Repository audit

The working directory (`C:\Users\SUCHIT CHOPADE\OneDrive\Desktop\GDG`) contains exactly
one repository: `GDG-PromptWars-`.

- Git history: one commit (`Initial commit`), branch `main`, remote `origin` configured.
- Contents: `README.md` (single line, `# GDG-PromptWars-`) and `LICENSE`. No source code,
  no `package.json`, no prompts, no scoring/readiness logic, no tests, no env/config files.
- **There is no prior academic-risk / mentoring codebase anywhere in the working
  directory to reuse as parts.** The "earlier projects" scenario in the brief does not
  apply here — there is nothing to classify as GPA prediction, job feeds, streaks, peer
  percentiles, GitHub scoring, resume generation or a generic chatbot, because there is
  no code at all.

Conclusion: **Phase 1's audit is short by necessity — go straight to scaffolding**, per
the brief's own fallback rule ("If no repository exists, say so and go straight to
scaffolding"). The repo exists (so we don't `git init` a new one) but is functionally
empty, so the migration plan (Phase 8) degenerates to steps 2–11 only; there is nothing
to move in step 4 and no behaviour to preserve in step 5.

---

## B. PRD feature → implementation mapping

| Feature | Existing implementation | Missing work | Target module | Owner |
|---|---|---|---|---|
| F1 Company Round Map | none | `getCompanies`, `getRoundMap`, seed company/round/topic JSON, S2 screen | `engine/content`, `data/companies`, `screens/progress` | Uthai (data/logic), Shruthi (S2) |
| F2 Drive Countdown Plan | none | `createStudent`, `getPlan`, `getNextTask`, `completePlanItem`, `replan`, next-task rule (7.3), S3 screen | `engine/planner`, `engine/session`, `screens/progress` | Uthai, Shruthi |
| F3 Probe Ladder | none | ladder transition table (3.1) as data, `nextStep`, `startLadder`, `submitStep`, P1 screen | `engine/ladder`, `engine/session`, `screens/practice` | Uthai, Reshma |
| F4 Gap Finder | none | `updateGaps`, suspected/confirmed state machine, gap labels | `engine/gaps` | Uthai |
| F5 Readiness Map | none | `getReadinessMap`, `getCellEvidence`, S4 screen + evidence panel | `engine/readiness`, `screens/progress` | Uthai, Shruthi |
| F6 Targeted Drills | none | `getDrill`, 6 drill-kind seed content, P2 screen | `engine/drills`, `data/drills`, `screens/practice` | Uthai, Reshma |
| F7 Re-Test to Confirm | none | re-test question selection, P3 screen (P1 reused with `role=retest`) | `engine/ladder`, `engine/gaps`, `screens/practice` | Uthai, Reshma |
| F8 Project Defense | none | `generateProjectQuestions`, `gradeProjectAnswer`, P4 screen | `grading/project`, `screens/practice` | Suchit, Reshma |
| F9 Proof-Based Grading | none | code runner, Grader/Verifier/Explainer prompts, `matchQuote`, `gradeStep` pipeline | `grading/runner`, `grading/ai`, `grading/prompts`, `grading/quote`, `grading/pipeline` | Suchit |
| F10 Say-It Practice (two-week) | none | `transcribe`, mic UI, P5 (inside P1) | `grading/transcribe`, `screens/practice` | Suchit, Reshma |
| F11 Round Debrief (two-week) | none | `saveDebrief`, S5 screen | `engine/debrief`, `screens/progress` | Uthai, Shruthi |
| F12 Clear Feedback | none | four-part `Feedback` from Explainer prompt, `FeedbackCard` | `grading/prompts` (Explainer), `screens/practice` components | Suchit, Reshma |
| F13 Real-Skill Check | none | **not built** — PRD "Later" tier, explicitly out of scope | — (extension point only) | — |
| F14 Mentor View | none | **not built** — PRD "Later" tier, explicitly out of scope | — (extension point only) | — |
| F15 Campus Memory | none | **not built** — PRD "Later" tier, explicitly out of scope | — (extension point only) | — |

F13–F15 get a named extension point (an `owner`/`later` comment at the natural seam —
e.g. `engine/content` for Campus Memory's round-map updates, a `Mentor` route stub in
`shell`) but no implementation, per the brief.

---

## C. Existing files: classification

There are no existing source files to classify. The only two repository files:

| File | Classification | Reason |
|---|---|---|
| `README.md` | REPLACE | Placeholder single-line title; replaced with the real project README (problem, architecture, setup, team — see section O). |
| `LICENSE` | KEEP | Unrelated to application structure; left as-is. |

Every module in section B is **MISSING** — there is nothing to KEEP, MOVE, REFACTOR or
REMOVE.

---

## D. Proposed architecture and reasons

**Modular monolith**: one Vite/React/TypeScript web app (`apps/web`) plus one tiny
serverless AI proxy (`apps/ai-proxy`). No microservices, no database server, no auth —
exactly what the PRD's MVP and the brief's constraints call for, and what four people
can hold in their heads at once.

Reasons for each major decision:

- **Domain folders with one `index.ts` each** (`grading`, `engine`, `data`, `shell`,
  `screens/progress`, `screens/practice`, `contracts`): this is what lets four people
  touch the codebase in parallel without merge conflicts — nobody edits another owner's
  internals, only their public index.
- **`lib/api` as the single frontend entry point**: screens never import `engine/*` or
  `grading/*` directly (UI/UX and the brief both require this). This is also exactly the
  seam where `USE_MOCKS` branches, and later where an HTTP client would replace in-process
  calls with `fetch('/api/v1/...')` — the contract doesn't change, only what's behind
  `lib/api` does.
- **A separate `ai-proxy` app, not a Gemini call from `grading/ai` directly**: this is a
  genuine conflict with the Team Plan (flagged in section I) and is resolved in favour of
  the security constraint — see section J.
- **`apps/` monorepo shape**: the brief's own Phase 3 asked for this so the engine and
  grading modules can "later move behind an HTTP API... without changing the contract."
  A flat `compass/src/...` layout (the Team Plan's literal shape) doesn't have a
  natural seam for that; nesting Team Plan's folder names under `apps/web/src` keeps
  every name and ownership line from the Team Plan intact while adding that seam.
- **Deterministic engine vs. AI-only grading**: the PRD is explicit (section 7, "Code
  decides wherever an objective check exists") that ladder transitions, gap status, cell
  colour and the plan are never delegated to the LLM. Splitting `engine` (pure, testable,
  no network calls) from `grading/ai` (the only place Gemini is called) makes this a
  structural guarantee, not a convention someone can accidentally violate — `engine` has
  no dependency on `grading/ai` at all, only on the `GradeResult` type it receives back
  through `submitStep`'s orchestration.

---

## E. Repository tree with folder purposes

```
compass/  (repo root, currently GDG-PromptWars-)
├── apps/
│   ├── web/                          Vite + React + TypeScript (strict). The MVP's only
│   │   │                             student-facing surface.
│   │   └── src/
│   │       ├── contracts/            The shared contract: types.ts, api.ts, errors.ts,
│   │       │                         mocks.ts, CONTRACT_VERSION. Owned by all four; any
│   │       │                         change needs one backend + one frontend approval.
│   │       ├── lib/api/               The ONLY module screens call. Routes each of the 17
│   │       │                         frontend functions to mocks.ts or the real engine/
│   │       │                         grading index, keyed on VITE_USE_MOCKS.
│   │       ├── grading/               Suchit. Everything that can call Gemini or run
│   │       │   ├── runner/           student code, and nothing else does.
│   │       │   ├── ai/               runner: Pyodide/sql.js in a Web Worker.
│   │       │   ├── prompts/          ai: the one AIService + provider adapter + schema
│   │       │   ├── quote/            validation.
│   │       │   ├── pipeline/         prompts: Grader, Verifier, Explainer, Project
│   │       │   ├── project/          question generator — one versioned file each.
│   │       │   └── transcribe/       quote: matchQuote (normalise + fuzzy match).
│   │       │                         pipeline: gradeStep, explain-on-failure.
│   │       │                         project: generateProjectQuestions, gradeProjectAnswer.
│   │       │                         transcribe: Gemini audio (two-week only).
│   │       ├── engine/                Uthai. All deterministic rules — no Gemini calls
│   │       │   ├── content/          anywhere in this tree.
│   │       │   ├── ladder/           content: seed bank + round map loaders/validation.
│   │       │   ├── gaps/             ladder: the PRD 3.1 transition table as DATA +
│   │       │   ├── readiness/        nextStep.
│   │       │   ├── planner/          gaps: updateGaps (suspected/confirmed/fixed).
│   │       │   ├── drills/           readiness: getReadinessMap, getCellEvidence.
│   │       │   ├── session/          planner: the 7.3 next-task rule, replan, getPlan,
│   │       │   ├── store/            getNextTask, completePlanItem.
│   │       │   └── debrief/          drills: getDrill by gap type.
│   │       │                         session: startLadder, submitStep — orchestrates
│   │       │                         runner → grading → ladder → gaps → readiness →
│   │       │                         planner, in API Contract 3.3's order.
│   │       │                         store: the Repository interface (in-memory /
│   │       │                         localStorage now, swappable for a real DB later).
│   │       │                         debrief: saveDebrief (two-week only).
│   │       ├── data/                  Uthai. companies/*.json, questions/<topic>/*.json,
│   │       │                         drills/*.json — the curated seed bank.
│   │       ├── shell/                 Shruthi. AppShell, TopNav, routes, theme tokens.
│   │       ├── screens/progress/      Shruthi. S1–S5 + their shared components
│   │       │                         (CellBadge, GapChip, LoadingState, ErrorState,
│   │       │                         EmptyState).
│   │       ├── screens/practice/      Reshma. P1–P5 + their shared components
│   │       │                         (StepIndicator, Timer, CodeEditor,
│   │       │                         TestResultTable, EvidenceQuotes, FeedbackCard).
│   │       └── config/                env parsing (USE_MOCKS, SCOPE, AI_PROXY_URL,
│   │                                  RUNNER_TIMEOUT_MS) — the only place
│   │                                  import.meta.env is read.
│   └── ai-proxy/                     Suchit. The one place GEMINI_API_KEY exists. A
│                                      serverless function that forwards validated
│                                      requests from grading/ai, checks origin, rate-
│                                      limits, and exposes a health route.
├── eval/                              Suchit. 30 hand-labelled answers, the runEval
│                                      runner, and its results — run on demand, not on
│                                      every PR (it costs API calls).
├── scripts/                           validate-seeds (checks the seed bank's shape
│                                      before it ever reaches the app), seed-demo-account.
├── tests/e2e/                         Shruthi (lead) + Reshma. Playwright: the PRD 8.3
│                                      demo path, run on mocks in CI.
├── docs/                              This audit, plus ARCHITECTURE, API_CONTRACT,
│                                      DATA_MODEL, TEAM_OWNERSHIP, SETUP.
├── .github/workflows/                 CI: lint, type-check, tests, validate-seeds,
│                                      build, bundle-key-check; e2e + deploy build on main.
├── .env.example
├── README.md
└── CONTRIBUTING.md
```

---

## F. Engine and grading domain boundaries

**Hard rule**: `engine/**` never imports from `grading/**`, and `grading/**` never
imports from `engine/**`. They only meet inside `engine/session/submitStep`, which
receives a `GradeResult` value (already-graded, already-typed) from
`grading/pipeline/gradeStep` — it never reaches into how that result was produced.

- `grading` owns: running student code, calling Gemini, quote matching, the eval harness.
  It has zero knowledge of ladders, gaps, readiness or plans.
- `engine` owns: the ladder state machine, gap status, readiness derivation, the planner,
  drills selection, session orchestration, and the Repository (storage) interface. It has
  zero knowledge of Gemini, prompts, or how a `GradeResult` was computed — only what one
  says.
- The **only** authoritative-rule-bearing code lives in `engine` (ladder transitions, gap
  confirmation, cell colour, plan ordering) and in `grading/pipeline` + `grading/quote`
  (test-pass/fail, quote matching) — never in a prompt. This matches "Authoritative
  rules — never delegated to the LLM" exactly: rules 1–3 and 7 are enforced in `grading`
  (runner pass/fail is a boolean from Pyodide/sql.js, quote matching is a normalise+fuzzy
  function, never Gemini's opinion); rules 4–6 are enforced in `engine`.

---

## G. Frontend screen and component boundaries

Call flow (enforced by ESLint import restrictions, not just convention):

```
Screen component → hook (e.g. useSubmitStep) → lib/api → engine or grading public index
```

- `screens/progress/*` and `screens/practice/*` import only from `../../lib/api`,
  `../../contracts`, `../../shell` (layout only) and their own local components — never
  `engine/*` or `grading/*`.
- Cell colour, gap labels, and "what's the next step" are **data returned by `lib/api`**,
  never computed in JSX. A `CellBadge` receives a `CellState` it renders; it does not
  decide what state a cell is in.
- Shared components are built once by their UI/UX-specified owner (section 5 of the
  UI/UX Specs) and imported by the other frontend member — never duplicated.
- Desktop-first screens (P1–P4, min 1024px) vs. also-360px screens (S1–S4, S5) are a
  CSS/layout distinction only; both read from the same `lib/api`.

---

## H. Data model and Repository interface

Entities are exactly PRD 7.4 / API Contract section 2 (`types.ts` is the literal source
of truth — see section I). The `Repository` interface `engine/store` exposes:

```ts
interface Repository {
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createStudent(input: Omit<Student, "id">): Promise<Student>;
  getStudent(id: string): Promise<Student | undefined>;
  saveLadder(ladder: LadderState): Promise<void>;
  getLadder(id: string): Promise<LadderState | undefined>;
  saveAttempt(attempt: Attempt): Promise<void>;
  getAttempts(studentId: string, topicId?: string): Promise<Attempt[]>;
  upsertGap(gap: Gap): Promise<void>;
  getGaps(studentId: string): Promise<Gap[]>;
  savePlan(plan: Plan): Promise<void>;
  getPlan(studentId: string): Promise<Plan | undefined>;
  saveDebrief(debrief: Debrief): Promise<void>;
}
```

An `InMemoryRepository` (or `localStorage`-backed) implements this for the MVP. Every
other engine module (`ladder`, `gaps`, `readiness`, `planner`) takes a `Repository` in
its constructor/factory — never touches storage directly — so a future Postgres/Mongo
adapter is a second implementation of the same interface, not a rewrite.

Readiness is **always derived** from `Attempt[]` + `Gap[]` on read (`getReadinessMap`
recomputes `CellState` from evidence); it is never itself persisted as a score, per the
brief's data rule.

---

## I. API Contract conformance check and conflicts found

`apps/web/src/contracts/types.ts` and `api.ts` are transcribed **verbatim** from the API
Contract tab — every enum, interface field name and function signature in section 2–3
of that doc. `CONTRACT_VERSION = "1.0.0"` is carried over unchanged.

Two real conflicts were found between tabs, both surfaced here rather than silently
resolved, per the standing instruction:

### Conflict 1 — Gemini key location (API Contract vs. Team Plan vs. security constraint)

- **Team Plan** (§4, Secrets): "the Gemini API key lives only in the environment file,
  which is never committed" — read literally, this describes a `.env` file for the web
  app. In Vite, only `VITE_`-prefixed env vars are readable by app code, and **every
  `VITE_`-prefixed variable is inlined into the browser bundle** at build time. If the
  key were read this way from inside `grading/ai` (browser code), it would ship to every
  visitor's browser — the opposite of "never committed" intent, and a direct violation
  of the build constraint that "the Gemini API key never reaches the browser bundle."
- **API Contract** (§1, Gemini): "only Backend 1 code in `src/grading` calls Gemini. The
  API key comes from an environment variable and is never shown in the UI" — this is
  compatible with either reading (a browser-inlined var is technically "an environment
  variable" and isn't rendered in any UI element, yet it is still extractable from the
  shipped JS).
- **Resolution taken**: the PRD/brief's explicit security constraint wins, since it is
  the more specific and higher-stakes requirement and nothing in the PRD contradicts it.
  `grading/ai`'s provider adapter calls `apps/ai-proxy` over HTTP (`VITE_AI_PROXY_URL`,
  itself not a secret); `GEMINI_API_KEY` exists only in the proxy's server-side
  environment and is checked for in CI (a bundle-content grep, see section O). **This
  needs one-line sign-off from the team**: the Team Plan's "environment file" phrasing
  should be read as "the ai-proxy's environment file," not the web app's.

### Conflict 2 — Readiness Map technical column count (PRD vs. API Contract vs. UI/UX)

- **PRD** F5: "Technical rows use the five ladder columns" (i.e. Recognize, Hint, Apply,
  Explain, Transfer — 5).
- **API Contract** §2.5, `ReadinessRow<Exclude<StepId, "hint">>`: an explicit type-level
  comment, "columns: recognize, apply, explain, transfer (hint folds into recognize)" —
  4 columns.
- **UI/UX Specs** §S4: "columns = Recognize, Apply, Explain, Transfer" — 4 named
  columns, matching the API Contract exactly.
- **Resolution taken**: implemented as **4 technical columns, hint folded into
  Recognize** — this is what the actual `ReadinessMap` type and the S4 screen spec are
  built against, and two independently-written lower-precedence docs agree on it in
  specific, typed/visual detail where the PRD's mention is a passing prose reference, not
  a table. Flagging this for the team regardless, since PRD nominally outranks both:
  if the team confirms PRD meant literally 5 visible columns, this is a one-line change
  to the `ReadinessRow` generic and the S4 grid header, not a redesign.

A third item, not a doc conflict but an extraction risk: the PRD's §3.1 ladder
transition table and HR-track table were rendered as columns by the PDF text extractor
used for this audit and had to be reconstructed by cross-referencing F4's gap table and
the UI/UX gap-label list (§5.1), which they now match exactly (see `docs/DATA_MODEL.md`
for the reconstructed table). **Uthai should visually re-check both tables against the
live PRD tab** before the transition-table unit tests are considered final — this is
listed as a risk in section R.

No other conflicts were found; the four tabs otherwise agree on function names, field
names, screen ids, ownership, and scope tiers.

---

## J. AI architecture, including the proxy and key handling

```
Grading pipeline (gradeStep, gradeProjectAnswer, transcribe)
        │
        ▼
   AIService (grading/ai)  — prompt registry lookup, one retry on schema failure
        │
        ▼
Provider adapter (grading/ai) — POSTs { promptId, input } to VITE_AI_PROXY_URL
        │
        ▼
apps/ai-proxy  — holds GEMINI_API_KEY, checks ALLOWED_ORIGIN, rate-limits,
                 calls the Gemini API with JSON-schema output, returns raw JSON
        │
        ▼
Schema validator (grading/ai, zod) — validates against API Contract §4 shapes
        │
        ▼
Typed result (GraderOutput | VerifierOutput | ExplainerOutput | ProjectQuestionsOutput)
```

- No module other than `grading/ai`'s provider adapter ever imports a Gemini SDK or
  fetches the proxy directly — enforced by ESLint's `no-restricted-imports` scoped to
  everything outside `grading/ai/**`.
- Grader and Verifier run at temperature 0 (passed as a fixed parameter in the prompt
  registry entry, not configurable by callers).
- The Grader prompt never receives a model answer (its input type has no such field).
  The Verifier prompt receives exactly one `RubricPoint` and its `spans` — never the
  full answer or other points (enforced by the function signature: `verify(point:
  RubricPoint, spans: string[]): Promise<VerifierOutput>`, nothing else in scope).
- On a schema-validation failure: one retry; on a second failure, return
  `GEMINI_BAD_JSON` (schema mismatch) or `GEMINI_FAILED` (network/provider error) up
  through `Result<T>` — never partially-typed data.
- Fallback on AI failure: the student's answer is kept, nothing is awarded, and the UI
  shows a retryable error (`ErrorState` with the message from `ApiError`) — the pipeline
  never fabricates a grade.
- Every AI call is logged (prompt id, latency, retry count, outcome) through a small
  structured logger in `grading/ai`; the key itself is never logged, and the logger is
  asserted (in a unit test) to reject any log payload containing the literal key value.
- `apps/ai-proxy` is a single serverless function (`api/generate.ts`, deployable to
  Vercel/Cloudflare/Netlify functions equally) plus `api/health.ts`. It does not know
  about ladders, students, or Compass domain types — it is a dumb, generic "validate
  origin → call Gemini with this schema → return JSON" box, which is what keeps it
  reusable if the event's chosen deployment target changes.

---

## K. Team ownership matrix

| Member | Primary domain | Folders | Functions or screens | Deliverables | Depends on |
|---|---|---|---|---|---|
| **Suchit** | Backend 1: grading & AI | `apps/web/src/grading/`, `apps/ai-proxy/`, `eval/` | `initRunner`, `runSample`, `runCode`, `gradeStep`, `explain`, `matchQuote`, `generateProjectQuestions`, `gradeProjectAnswer`, `transcribe`, `runEval` | Working code runner + grading pipeline; eval report ≥85% agreement | `contracts` (M0); one seed BFS question from Uthai |
| **Uthai** | Backend 2: engine & data | `apps/web/src/engine/`, `apps/web/src/data/`, `scripts/validate-seeds` | `startLadder`, `submitStep`, `nextStep`, `updateGaps`, `getReadinessMap`, `getCellEvidence`, `replan`, `getPlan`, `getNextTask`, `completePlanItem`, `getDrill`, `saveDebrief` | Ladder/gap/readiness/planner logic + seed bank + demo account | `contracts` (M0); `runCode`/`gradeStep` from Suchit for `submitStep` |
| **Reshma** | Frontend 1: practice | `apps/web/src/screens/practice/` | P1–P5 + practice shared components | Probe/Drill/Re-test/Project Defense/Say-It screens working on mocks, then real API | `contracts` + mocks (M0); theme tokens/AppShell from Shruthi |
| **Shruthi** | Frontend 2: progress | `apps/web/src/shell/`, `apps/web/src/screens/progress/`, `tests/e2e/` (lead) | S1–S5 + progress shared components + AppShell/TopNav/routes | Setup/Round Map/Plan/Readiness Map/Debrief screens + demo e2e test | `contracts` + mocks (M0) |
| **All four** | Contract | `apps/web/src/contracts/`, `apps/web/src/lib/api/` | — | Shared types/mocks stay in sync; any change needs 1 backend + 1 frontend approval | — |

Every folder in section E has exactly one owner; every P0–P1 feature (F1–F12) has
exactly one primary owner in section B. F13–F15 are unowned (out of scope).

---

## L. Dependency matrix

```
contracts + mocks ─────────────────────────────────────────► everyone (M0 gate)
theme tokens + AppShell (Shruthi) ─────────────────────────► Reshma
one complete BFS seed question (Uthai) ────────────────────► Suchit, Reshma
runCode + gradeStep (Suchit) ───────────────────────────────► submitStep (Uthai)
submitStep (Uthai) ─────────────────────────────────────────► P1, P3 (Reshma)
readiness, evidence, plan functions (Uthai) ────────────────► S3, S4 (Shruthi)
EvidenceQuotes + TestResultTable (Reshma) ──────────────────► S4 evidence panel (Shruthi)
CellBadge + GapChip (Shruthi) ──────────────────────────────► P1 end summary (Reshma)
```

This is a DAG with one join point (`submitStep`) that both backend owners must clear
before either frontend owner can leave mocks — which is exactly why `USE_MOCKS=true`
staying alive through M1 is a working rule, not a nicety.

---

## M. Git and branch strategy

- `main` is protected; all changes land via PR.
- Branch names: `owner/task` (e.g. `reshma/probe-screen`, `uthai/transition-table`),
  per the Team Plan.
- Review pairs: Suchit ↔ Uthai (backend), Reshma ↔ Shruthi (frontend). Any PR touching
  `apps/web/src/contracts/**` requires one approval from each side regardless of who
  opened it.
- PR template (added at `.github/pull_request_template.md`) captures: what & why,
  affected module, PRD feature id(s), screenshots (UI changes), tests run, contract
  changes (with version bump called out), dependency impact.
- No `develop` branch unless integration pain proves it's needed (none yet — repo is at
  M0).

---

## N. Testing strategy

- **Unit (Vitest, no LLM calls)**: every row of the transition table (technical + HR);
  suspected→confirmed→fixed + assisted-pass flows; cell-state derivation ("green only on
  a clean pass or a passed re-test on a fresh question"); planner next-task ordering;
  `matchQuote` normalisation/fuzzy threshold incl. mixed-language samples; drill
  selection by gap type.
- **Runner tests**: passing/failing tests, runtime errors, and timeouts, for both Python
  and SQL, inside the actual Web Worker.
- **Contract tests**: `mocks.ts` type-checks against `types.ts` (enforced by `tsc`
  itself, since mocks are typed as the real interfaces — no separate runtime check
  needed beyond that); AI fixtures validate against the §4 zod schemas;
  `CONTRACT_VERSION` is asserted equal across `apps/web` and `apps/ai-proxy`.
- **AI tests**: recorded Gemini responses replayed through validation → retry →
  fallback; prompt regression fixtures for Grader/Verifier.
- **Eval**: `runEval` against the 30 hand-labelled answers, run manually/on demand
  (costs real API calls) — never wired into the PR pipeline.
- **E2E (Playwright)**: the PRD 8.3 demo path on mocks in CI; on the real stack once,
  by hand, before the actual demo.

---

## O. CI/CD plan

`.github/workflows/ci.yml` — on every PR: `lint` → `typecheck` → `test` (unit + runner +
contract) → `validate-seeds` → `build` → a bundle-key-check step that greps the built
`apps/web/dist` output for the literal `GEMINI_API_KEY` value and fails the build if
found (belt-and-braces on top of it never being a `VITE_`-prefixed var in the first
place).

`.github/workflows/main.yml` — everything above, plus the Playwright e2e demo path (on
mocks) and a deploy-ready build of both `apps/web` and `apps/ai-proxy`.

Documentation set created:

| File | Contents |
|---|---|
| `README.md` | Problem, solution, Probe Ladder + verified grading, architecture, structure, setup, env vars, running, testing, team |
| `docs/ARCHITECTURE.md` | Domains, call flow, code-vs-AI boundary, folder purposes |
| `docs/API_CONTRACT.md` | Mirrors the API Contract tab + the future `POST /api/v1/<functionName>` mapping |
| `docs/DATA_MODEL.md` | Every entity: purpose, fields, relations, lifecycle, owning domain; the reconstructed ladder transition table |
| `docs/TEAM_OWNERSHIP.md` | Ownership + dependency matrices |
| `docs/SETUP.md` | Local setup, mocks mode, running eval |
| `CONTRIBUTING.md` | Branches, PR template, review pairs, contract-change process |

---

## P. Migration plan (applied to this empty repo)

Steps 3–6 of the standard 11-step plan (map existing files → move without behaviour
change → fix imports → run existing tests) are vacuous here since there is nothing to
map or move. What this session actually executes:

1. ~~Audit~~ — done (this document).
2. Create the target structure (section E).
3. ~~Map existing files~~ — nothing to map.
4. ~~Move files~~ — nothing to move.
5. ~~Fix imports~~ — nothing to fix.
6. ~~Run existing tests~~ — none exist.
7. Introduce `contracts` and `lib/api`, wired to `mocks.ts` by default.
8. Split domain boundaries (section F/G) as empty-but-typed `index.ts` stubs so all four
   owners can start writing behind their own index without waiting on each other.
9. Add the test scaffolding from section N (empty suites wired to the seed data
   structure, ready for each owner to fill in).
10. **Not done in this session** — implementing F1–F12 is each owner's M1 work, not a
    single-session task; see section R.
11. **Not done in this session** — demo path validation happens at M2/M4.

---

## Q. Implementation order, aligned to Team Plan milestones

- **M0 Contracts** (this session): `types.ts`/`api.ts`/`errors.ts`/`mocks.ts` written
  together, `CONTRACT_VERSION` set, every domain's public `index.ts` scaffolded and
  type-checking, `USE_MOCKS=true` routing wired in `lib/api`, Pyodide + sql.js confirmed
  loading inside Vite (the brief's explicit first task — see section R), CI skeleton in
  place. **Gate**: all four folders import `contracts/types.ts` without error; `npm run
  build` succeeds; the runner-load check passes in the browser.
- **M1 Parallel build** (owners, next): Probe screen runs end-to-end on mocks; `gradeStep`
  grades the seed BFS question; every transition-table unit test passes; Setup→Plan→Map
  works on mocks.
- **M2 Integration**: flip `USE_MOCKS=false`; demo path works end-to-end against real
  `submitStep`.
- **M3 Quality**: eval targets met; no console errors; phone layouts checked at 360px.
- **M4 Demo ready**: three clean rehearsals + backup video.

---

## R. Risks and blockers

1. **Runner loading inside the build tool (Pyodide + sql.js in Vite) — first risk,
   checked in this session** (section below has the result).
2. **Ladder transition table transcription risk** — the PDF extraction scrambled the
   §3.1 and HR-track tables; the version in `docs/DATA_MODEL.md` was reconstructed by
   cross-referencing F4 and the UI/UX gap labels and is internally consistent, but Uthai
   should eyeball it against the live doc before writing the 15 transition-table unit
   tests against it.
3. **Gemini key / ai-proxy conflict** (section I, conflict 1) — needs a one-line team
   sign-off; implemented per the stricter reading in the meantime.
4. **Readiness column count** (section I, conflict 2) — needs a one-line team sign-off;
   implemented as 4 columns in the meantime, since that's what the typed contract and
   the S4 spec both build against.
5. **`submitStep`'s single join point** (section L) — both backend owners must clear it
   before either frontend owner can flip off mocks; if either backend task slips, the
   Team Plan's own "blocked >30 min → switch tasks" rule applies.
6. **Eval targets are tuned, not guaranteed** — 85% agreement / ≤5% false-award /
   ≤10% false-reject are targets to tune the Verifier prompt toward on the 30-answer
   set, not properties this scaffold can pre-guarantee.

---

## S. Definition of Done per milestone

Lifted directly from Team Plan §3.2, unchanged (this is the Team Plan's own gate
language and shouldn't be restated differently by an audit):

- **M0**: all four import `types.ts`; mocks run; Pyodide and sql.js load in the build
  tool.
- **M1**: Probe screen runs end to end on mocks; `gradeStep` grades the BFS question;
  every transition-table test passes; Setup → Plan → Map works on mocks.
- **M2**: with `USE_MOCKS=false`, the demo path works: probe → amber → confirm → red →
  drill → re-test → green.
- **M3**: Grader–human agreement 85%+, false awards ≤5%, false rejects ≤10%; no console
  errors; phone layouts checked.
- **M4**: three clean rehearsals of the PRD 8.3 script in a row; backup video recorded.

(Sprint-mode cuts, per the Team Plan: M3 → a 10-answer check; M4 → one rehearsal + the
backup video.)
