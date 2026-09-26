# Backend 2 -> Grading hand-off (for Suchit)

What the engine (`apps/web/src/engine`, Uthai) expects from grading. Every type
below is an existing interface in `apps/web/src/contracts/types.ts`; nothing here
adds a field.

## How the engine calls grading

`engine/session` (`submitStep`) is the only engine code that touches grading. It
calls **one** function, injected through `EngineDeps.gradeStep` (`engine/deps.ts`):

```ts
type GradeStepFn = (question: Question, step: AnyStep, answer: string) => Promise<GradeResult>;
```

By default this loads `gradeStep` from `grading/` lazily (`session/index.ts`).
Tests and the mocks inject a stand-in instead, so the engine has no compile-time
or logic dependency on how grading works.

The engine does **not** call `runCode`, `explain`, `matchQuote` or `runEval`.
`gradeStep` already calls `runCode` for code steps and `explain` for failures
(`grading/pipeline/index.ts`), and its signature has no parameter for a
pre-computed `RunResult`, so calling `runCode` from `submitStep` as well would
execute the tests twice. `submitStep` therefore satisfies API Contract 3.3
(steps 2-3) through the single `gradeStep` call.

The engine passes the **full** `Question` (hidden tests included). Only what
`startLadder` returns to the frontend has hidden tests blanked.

## Code steps (Apply, Transfer on a question that has `lang`)

Input, from the engine:

| Field | Source |
| --- | --- |
| `question` | full `Question`, with `lang`, `tests` (Apply) or `variant.tests` (Transfer) |
| `step` | `"apply"` or `"transfer"` |
| `answer` | the student's code |

Expected `GradeResult`:

| Field | Requirement |
| --- | --- |
| `step` | must equal the input step, else `submitStep` fails with `CONTRACT_MISMATCH` |
| `passed` | `run.passed` |
| `run` | `RunResult`: `passed`, `results: TestResult[]`, `runtimeMs`, `firstFailure?` |
| `feedback` | `Feedback`, present when `passed` is false |

The engine stores the `GradeResult` on the `Attempt` unchanged. Readiness and
Cell Evidence show `run.results` / `run.firstFailure` as the code-test evidence.

Test-case convention the seed data uses (please confirm `runCode` parses it):

- Python: `TestCase.input` is a JSON array of the function's arguments,
  `expected` is the JSON of the return value.
- SQL: `input` is a setup script (schema + rows), `expected` is the JSON array
  of result rows. Every SQL question orders its output.

## Open-ended steps (Recognize, Hint, Explain, HR steps, and Apply/Transfer on a question with no `lang`)

Input: the same `(question, step, answer)`, where `question.rubrics[step]` holds
the `RubricPoint[]` and the question has no `lang`.

Expected `GradeResult`:

| Field | Requirement |
| --- | --- |
| `step` | equal to the input step |
| `passed` | every `required` rubric point met |
| `rubric` | one `RubricResult` per point: `pointId`, `spans` (quotes), `quoteMatched`, `verifierYes`, `met` (= `quoteMatched && verifierYes`) |
| `feedback` | `Feedback`, present when `passed` is false |
| `run` | absent |

The engine never grades text itself. Cell Evidence returns `rubric` as the
grading evidence.

## Current blocker

`grading/pipeline/index.ts` line 83, in `gradeStep`:

```ts
if (!lang) throw new Error(`Question ${question.id} has no language for a code step`);
```

Apply and Transfer are unconditionally treated as code steps, so **any question
without `lang` throws at Apply or Transfer**. This affects the Project
Explanation topic (`q_project_*`), which is open-ended on every step: its
ladder cannot get past Recognize/Hint with real grading, and the engine
surfaces the error rather than continuing.

Required behaviour (no contract change needed):

```text
if the question has a lang and the step is Apply/Transfer -> code grading (runCode)
otherwise                                                    -> rubric/open-ended grading (gradeOpenStep)
```

i.e. `isCodeStep(step) && question.lang !== undefined` in `gradeStep`. The
rubrics for those steps are already in the seed data (`rubrics.apply`,
`rubrics.transfer`, and `variant.prompt` with `tests: []`). The engine stays
agnostic about how this is implemented.

## Errors

If `gradeStep` throws, the engine saves nothing (no Attempt, ladder unchanged)
so the student can retry. The thrown error is mapped to a contract code by
`engine/errors.ts`: `NotImplementedError` -> `RUNNER_NOT_READY`; an error with a
`code` property that is a contract `ErrorCode` (`RUN_TIMEOUT`, `GEMINI_FAILED`,
`GEMINI_BAD_JSON`, ...) keeps it; anything else -> `INVALID_STEP` from
`lib/api`. Throwing an object with a `code` is the way to get a specific code.
Note: a grader failure is returned as a thrown error, not as a failed grade,
so a grading outage never counts as a student failure or creates a gap.

## Behaviour the grader can rely on

- **Assisted:** `GapStatus` has no `assisted` value. The engine records
  assisted-ness on `Attempt.assisted` / `StepOutcome.assisted`; an assisted
  pass never fixes a gap and never turns a cell green. Grading does not need to
  know about it.
- **Fixed:** only an unassisted pass on a question the student has not failed
  before, i.e. a fresh re-test. Finishing a drill never changes a gap.
- **Speed:** derived by the engine from `timeMs` vs `question.targetTimeMs`.
  The threshold is `DEFAULT_SLOW_FACTOR` (1.5), an **implementation
  assumption, not a PRD requirement**; override with `EngineDeps.slowFactor`.

## Known limitation (needs a contract decision, not Suchit)

A gap created by `saveDebrief` has no `Attempt`, so `getCellEvidence` cannot
explain that cell. Fixing this needs a `CellEvidence` change (frontend and
backend approval). No attempt evidence is faked.

## Two-week seed coverage (Uthai; not blocking M2 on sprint scope)

Eight two-week topics are defined but have no questions. Seed validation keeps
warning about them. Each needs a `probe`, `confirm` and `retest` question.

| Topic | Questions | Required roles | Status |
| --- | --- | --- | --- |
| `tp_arrays_strings` | 0 | probe, confirm, retest | not started |
| `tp_trees` | 0 | probe, confirm, retest | not started |
| `tp_dp` | 0 | probe, confirm, retest | not started |
| `tp_normalization` | 0 | probe, confirm, retest | not started |
| `tp_transactions` | 0 | probe, confirm, retest | not started |
| `tp_os_processes` | 0 | probe, confirm, retest | not started |
| `tp_os_deadlocks` | 0 | probe, confirm, retest | not started |
| `tp_oop` | 0 | probe, confirm, retest | not started |

The required question counts come from the sprint convention; the Team Plan
has not been available to confirm them.
