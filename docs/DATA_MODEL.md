# Compass — Data Model

Entities per PRD §7.4 / API Contract §2. Literal shapes live in
`apps/web/src/contracts/types.ts`; this file adds purpose, lifecycle and
owning domain, and the reconstructed ladder transition table.

| Entity | Purpose | Owning domain | Lifecycle |
| --- | --- | --- | --- |
| `Student` | The one local MVP student: target company, drive date, hours/day, scope | `engine/store` | Created once at Setup (S1); read everywhere |
| `Company` / `Round` / `Topic` | Curated round map: what a company tests, in order, weighted | `engine/content`, `data/companies` | Static seed data, hand-curated |
| `Question` | A curated probe/confirm/retest question: prompt, rubric, hint, variant, hidden tests | `engine/content`, `data/questions` | Static seed data, hand-checked |
| `LadderState` | One in-progress or completed run through the Probe Ladder for one question | `engine/ladder`, `engine/session` | Created by `startLadder`, updated by every `submitStep`, ends at `current: "done"` |
| `Attempt` | One step's full evidence: answer, grade, assisted flag, time | `engine/store` | Appended by `submitStep`; never mutated after |
| `Gap` | A student's gap on one topic+step: type, status | `engine/gaps` | suspected → confirmed → fixed (see below); never deleted, only updated |
| `ReadinessCell` / `ReadinessMap` | Derived view of proven/suspected/confirmed/untested per topic×step | `engine/readiness` | Recomputed on read from `Attempt[]` + `Gap[]` — **never stored as a score** |
| `PlanItem` / `Plan` | The daily plan | `engine/planner` | Rebuilt by `replan` after every probe/re-test |
| `Drill` | Practice matched to a gap type | `engine/drills`, `data/drills` | Static seed data (6 kinds) |
| `ProjectQuestion` / `ProjectCardItem` | Project Defense questions + readiness card | `grading/project` | Generated per session from pasted text; not persisted long-term in the MVP |
| `Debrief` | A logged real round, turned into gaps (two-week scope) | `engine/debrief` | Created by `saveDebrief`; feeds new `Gap`s |

## Repository interface

`engine/store`'s `Repository` interface is what every other engine module
depends on instead of touching storage directly (see `docs/PHASE0_AUDIT.md`
section H for the full interface). `InMemoryRepository` implements it for
the MVP; a real database later is a second implementation of the same
interface, not a rewrite.

## The Probe Ladder transition table (PRD §3.1)

Reconstructed from the PRD tab after a PDF-text-extraction pass scrambled its
columns during the Phase 0 audit; cross-checked against F4's gap table and
the UI/UX gap labels (§5.1), which it now matches exactly. **Uthai: please
eyeball this against the live PRD tab before treating the unit tests in
`engine/ladder/index.test.ts` as final** (docs/PHASE0_AUDIT.md, risk R2).

### Technical track

| Step | On pass | On fail | Gap on fail | Gap on pass |
| --- | --- | --- | --- | --- |
| 1. Recognize | skip to Apply | go to Hint | *(deferred to step 2)* | — |
| 2. Hint | go to Apply | show approach, go to Apply (marks assisted) | Concept | Recall |
| 3. Apply | go to Explain | show one failing test, go to Explain | Coding | — |
| 4. Explain | go to Transfer | ladder ends | Explaining | — |
| 5. Transfer | ladder ends | ladder ends | Adapting | — |

Plus: any step, over time (repeatedly slow to pass) → **Speed** gap — this
one isn't a transition-table row, it's derived from `targetTimeMs` vs.
recorded time (PRD §3.1, "Speed").

### HR track (sequential, no skip logic)

| Step | Checks | On fail |
| --- | --- | --- |
| 1. Structure | Situation, action and result all present | Structure gap |
| 2. Specifics | A concrete example, the student's own role, a number/outcome | Vague gap |
| 3. Follow-up | Handles one probing follow-up consistently | Follow-up gap |

## Gap state machine (rule 5)

- First failure on a topic+step → `suspected`.
- Second failure on the **same** topic+step → `confirmed`.
- A clean pass, or a passed re-test on a **fresh** question → `fixed`.
- An assisted pass never fixes a gap on its own.

Implemented in `engine/gaps` (`updateGaps`), tested in
`engine/gaps/index.test.ts`.
