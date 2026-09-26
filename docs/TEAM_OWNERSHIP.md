# Compass — Team Ownership & Dependencies

Full reasoning in `docs/PHASE0_AUDIT.md` sections K/L. This is the quick
reference.

## Ownership matrix

| Member | Primary domain | Folders | Functions or screens | Depends on |
| --- | --- | --- | --- | --- |
| **Suchit** | Backend 1: grading & AI | `apps/web/src/grading/`, `apps/ai-proxy/`, `eval/` | `initRunner`, `runSample`, `runCode`, `gradeStep`, `explain`, `matchQuote`, `generateProjectQuestions`, `gradeProjectAnswer`, `transcribe`, `runEval` | `contracts` (M0); one seed BFS question from Uthai |
| **Uthai** | Backend 2: engine & data | `apps/web/src/engine/`, `apps/web/src/data/`, `scripts/validate-seeds` | `startLadder`, `submitStep`, `nextStep`, `updateGaps`, `getReadinessMap`, `getCellEvidence`, `replan`, `getPlan`, `getNextTask`, `completePlanItem`, `getDrill`, `saveDebrief` | `contracts` (M0); `runCode`/`gradeStep` from Suchit for `submitStep` |
| **Reshma** | Frontend 1: practice | `apps/web/src/screens/practice/` | P1–P5 + practice shared components | `contracts` + mocks (M0); theme tokens/AppShell from Shruthi |
| **Shruthi** | Frontend 2: progress | `apps/web/src/shell/`, `apps/web/src/screens/progress/`, `tests/e2e/` (lead) | S1–S5 + progress shared components + AppShell/TopNav/routes | `contracts` + mocks (M0) |
| **All four** | Contract | `apps/web/src/contracts/`, `apps/web/src/lib/api/` | — | — |

Review pairs: Suchit ↔ Uthai (backend), Reshma ↔ Shruthi (frontend). Any PR
touching `contracts/` needs one approval from each side.

## Dependency matrix

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

## Milestones (Team Plan §3.2)

| Milestone | Gate |
| --- | --- |
| M0 Contracts | All four import `types.ts`; mocks run; Pyodide and sql.js load in the build tool — **verified in this session, see below.** |
| M1 Parallel build | Probe screen runs end to end on mocks; `gradeStep` grades the BFS question; every transition-table test passes; Setup → Plan → Map works on mocks |
| M2 Integration | With `USE_MOCKS=false`, the demo path works: probe → amber → confirm → red → drill → re-test → green |
| M3 Quality | Grader–human agreement ≥85%, false awards ≤5%, false rejects ≤10%; no console errors; phone layouts checked |
| M4 Demo ready | Three clean rehearsals of the PRD §8.3 script in a row; backup video recorded |

Sprint-mode cuts: M3 → a 10-answer check; M4 → one rehearsal + the backup
video.
