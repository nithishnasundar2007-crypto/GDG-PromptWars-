# Compass

A placement-preparation coach that finds out *why* a student fails each
question, fixes only that gap, and proves the fix before the next company
drive.

Every placement platform tells you that you got a question wrong. Compass
finds out why, fixes only that, and prepares you for the exact company
visiting next.

## Core innovation: the Probe Ladder + verified grading

Every technical question runs through five fixed steps —
**Recognize → Hinted recall → Apply → Explain → Transfer** — completing
every reachable step, so an early failure never hides a later gap. The step
where the student breaks decides the gap type (concept, recall, coding,
explaining, adapting, speed). A wrong answer isn't just "wrong" — it's one
of these, and each needs a different fix.

Grading is proof-based, not AI opinion:

- **Code** (Apply, Transfer): judged by running hidden tests in the browser
  (Pyodide for Python, sql.js for SQL). The AI never decides pass/fail.
- **Open-ended answers**: every awarded rubric point must (1) quote the
  student's own words, verified by a fuzzy quote matcher, and (2) pass a
  separate, strict Verifier call that sees only that one point.

See `docs/PHASE0_AUDIT.md` for the full audit and architecture reasoning,
and the PRD/API Contract/UI-UX/Team Plan doc tabs for the source of truth.

## Architecture

A modular monolith: one web app (`apps/web`) + one tiny AI proxy
(`apps/ai-proxy`). No microservices, no database server, no auth in the MVP.
Deterministic logic (ladder, gaps, readiness, planner, code tests, quote
matching) is fully separate from AI calls and testable without Gemini. See
`docs/ARCHITECTURE.md`.

```
apps/
  web/         Vite + React + TypeScript (strict) — the student-facing app
  ai-proxy/    Serverless function holding GEMINI_API_KEY
eval/          30 hand-labelled answers + the grading eval harness
scripts/       validate-seeds, check-bundle-key
tests/e2e/     Playwright — the PRD demo path
docs/          Architecture, API contract, data model, ownership, setup
```

## Setup

See `docs/SETUP.md`. tl;dr:

```bash
npm install
npm run dev   # mocks on by default — no Gemini key needed
```

## Running & testing

```bash
npm run dev         # apps/web dev server
npm run build        # both apps
npm run typecheck     # both apps
npm run lint
npm run test          # Vitest, no LLM calls
npm run validate-seeds
```

## Environment variables

See `.env.example` — `VITE_USE_MOCKS`, `VITE_SCOPE`, `VITE_AI_PROXY_URL`,
`VITE_RUNNER_TIMEOUT_MS` (web); `GEMINI_API_KEY`, `GEMINI_MODEL`,
`ALLOWED_ORIGIN`, `PORT` (ai-proxy, server-side only — never committed).

## Team

| Member | Owns | Docs |
| --- | --- | --- |
| Suchit | Grading, AI proxy, eval | `apps/web/src/grading/`, `apps/ai-proxy/`, `eval/` |
| Uthai | Engine, seed data | `apps/web/src/engine/`, `apps/web/src/data/` |
| Reshma | Practice screens (P1–P5) | `apps/web/src/screens/practice/` |
| Shruthi | Shell + progress screens (S1–S5) | `apps/web/src/shell/`, `apps/web/src/screens/progress/` |

Full matrix + dependencies: `docs/TEAM_OWNERSHIP.md`. Contribution process,
branches and the contract-change rule: `CONTRIBUTING.md`.
