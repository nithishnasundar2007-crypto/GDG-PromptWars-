# Compass — Setup

## Prerequisites

- Node 20+ (repo tested with Node 25 / npm 11)
- A Gemini API key, for `apps/ai-proxy` only — never needed to run the web
  app in mocks mode

## Install

```bash
npm install
```

This is an npm workspaces monorepo (`apps/web`, `apps/ai-proxy`) — one
install at the root covers both.

## Running with mocks (default — no backend, no Gemini key needed)

```bash
cp .env.example apps/web/.env.local   # VITE_USE_MOCKS=true is the default
npm run dev
```

Opens the Vite dev server for `apps/web`. Every screen reads from
`contracts/mocks.ts` via `lib/api` until M2.

## Running the ai-proxy (only needed once USE_MOCKS=false)

```bash
cp .env.example apps/ai-proxy/.env
# fill in GEMINI_API_KEY in apps/ai-proxy/.env
npm run dev -w ai-proxy
```

Then set `VITE_USE_MOCKS=false` and `VITE_AI_PROXY_URL=http://localhost:8787`
in `apps/web/.env.local`.

## Testing

```bash
npm run test          # Vitest — unit + contract tests, no LLM calls
npm run typecheck      # tsc -b, both apps
npm run lint           # ESLint (import-boundary rules included)
npm run validate-seeds # checks apps/web/src/data/**/*.json shape + coverage
```

`eval/`'s `runEval` (once built — M1) costs real Gemini calls; run it by
hand, never in CI:

```bash
npm run eval -w web   # not wired yet — see eval/README.md
```

## Runner-load check (the PRD's day-one risk)

`apps/web/src/grading/runner/loadCheck.ts` verifies Pyodide + sql.js actually
load inside Vite's Web Worker bundling. It runs automatically when you visit
`/setup` in dev — check the browser console/page for `pyodide: loaded` /
`sqlJs: loaded`. See `docs/PHASE0_AUDIT.md` section R for the verified
result from this scaffolding session.

## Scope

Set `VITE_SCOPE=sprint` or `VITE_SCOPE=two-week` in `apps/web/.env.local`
(PRD §8.1). Sprint: 1 company, 3 topics, F1–F9. Two-week: 2 companies, 12
topics, plus F10–F12.
