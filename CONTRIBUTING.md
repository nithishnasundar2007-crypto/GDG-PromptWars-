# Contributing to Compass

## Branches

One branch per task, named `owner/task` (e.g. `reshma/probe-screen`,
`uthai/transition-table`). Merge into `main` through a pull request. `main`
is protected — no direct pushes.

## Review pairs

- Suchit ↔ Uthai review each other's backend code.
- Reshma ↔ Shruthi review each other's screens.
- Any change to `apps/web/src/contracts/**` needs **one backend + one
  frontend** approval, regardless of who opened the PR.

## Contract-change process

Never change a shared type from inside your own folder.

1. Edit `apps/web/src/contracts/{types,api,errors,mocks}.ts`.
2. Bump `CONTRACT_VERSION` in `types.ts`.
3. Update `apps/ai-proxy/src/config.ts`'s `CONTRACT_VERSION` to match.
4. Get one backend + one frontend approval.
5. Announce it to the team before merging.

## Pull request template

Every PR description should cover:

- **What & why**
- **Affected module(s)**
- **PRD feature id(s)** touched (F1–F15)
- **Screenshots**, if a UI change
- **Tests run**
- **Contract changes**, with the version bump called out (or "none")
- **Dependency impact** — does this unblock or block anyone per
  `docs/TEAM_OWNERSHIP.md`'s dependency matrix?

(`.github/pull_request_template.md` has the same checklist pre-filled.)

## Working rules (Team Plan §4)

- **Mocks stay alive**: `VITE_USE_MOCKS=true` must keep working until M2 is
  passed, so frontend work never waits on the backend.
- **Blockers**: if you're waiting on someone for more than 30 minutes, say
  so and switch to a task that doesn't depend on them.
- **Demo path first**: anything on the PRD §8.3 demo path beats every other
  task. If time runs short, cut from the two-week items first, then P2
  drill kinds, then S5.
- **Secrets**: `GEMINI_API_KEY` lives only in `apps/ai-proxy`'s environment
  file, which is never committed (see `docs/PHASE0_AUDIT.md` section I,
  conflict 1, for why this is `apps/ai-proxy`'s `.env`, not `apps/web`'s).

## Code quality

TypeScript strict mode, ESLint (import-boundary rules included — screens
can't import `engine/*`/`grading/*` directly), Prettier, one public
`index.ts` per domain, `Result<T>` instead of thrown exceptions across
module boundaries, zod at every external boundary (AI output, seed JSON,
env). Avoid: god files, duplicated rules, hard-coded URLs/keys, Gemini calls
outside `grading/ai`, logic inside JSX, circular imports, hidden global
state.
