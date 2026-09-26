# Backend 1 (Grading & AI) — module map

Every grading module maps to a PRD feature id and the specific student-facing
question it serves. Nothing here exists outside the PRD: no chatbot, no
scoring percentages, no hire prediction.

| Module | PRD feature | Student-facing question it serves |
|---|---|---|
| `grading/pipeline/` (grade-step, code-step, rubric-step) | F9 Proof-Based Grading | "Did I actually get this right?" — a step only passes when there's real evidence in the student's own words/code, never an AI's opinion alone. |
| `grading/quote/` (matchQuote, normalise) | F9 Proof-Based Grading | The authoritative gate behind the same question — a Grader-claimed quote that isn't really in the answer can never count as evidence. |
| `grading/pipeline/explain.ts` + `fallback-feedback.ts` | F12 Clear Feedback | "What should I improve?" — the four-part Feedback (what happened / why wrong / what's missing / what to try next), always in plain, actionable language, even when the AI call itself fails. |
| `grading/runner/` (worker, python-host, sql-host, runner-client) | F9 Proof-Based Grading (code steps) | "Does my code actually work?" — runs the student's code against hidden tests in a sandboxed Worker, never trusting a description of what the code does. |
| `grading/project/` (generate-questions, grade-answer, cache) | F8 Project Defense | "Can I actually explain my own project?" — interviewer-style questions built from the student's own pasted project text, graded with the same proof-based standard as a ladder step. |
| `grading/transcribe/` | F10 Say-It Practice | "Did I actually say the right thing out loud?" — transcribes a spoken answer so the student can check it before it's graded as an Explain step. |
| `grading/ai/` (AIService, schemas, retry/timeout) | Cross-cutting (F9/F10/F12) | Not student-facing directly — the one place any of the above talks to Gemini, with a hard timeout, one retry, and zod-validated output so a bad AI response never becomes a fabricated grade. |
| `grading/eval/` | PRD §8.4 (eval targets) | Not student-facing — answers the team's own question, "is the Grader actually agreeing with a human?", against the ≥85% agreement / ≤5% false-award / ≤10% false-reject targets. |
| `apps/ai-proxy/` | Cross-cutting (§7.5 architecture) | Not student-facing — keeps the Gemini key server-side and enforces the fixed `/v1/*` surface, origin allow-list, rate limit, and (where a live Firebase project exists) App Check. |

## Testing coverage targets (hard rule §3.4)

| Area | Lines | Branches | Actual (this session) |
|---|---|---|---|
| `grading/quote/**` | ≥95% | ≥90% (see docs/CONFLICTS.md #9 for the 80% floor actually enforced) | 100% lines / 83.3% branches |
| `grading/pipeline/**` | ≥95% | ≥90% | 100% lines / 96.3% branches |
| `grading/ai/**` | ≥95% | ≥90% | 100% lines / 92.9% branches |
| everything else in `grading/**` | ≥85% | — | see `npm run coverage -w web` |
| `apps/ai-proxy/**` | ≥85% | — | 98.4% lines |

Excluded from the gate (typechecked/lint-checked, not coverage-counted):
`grading/runner/{worker,python-host,sql-host,runner-client,loadCheck,
pyodideWorker}.ts` — real execution needs a live browser Worker environment
this sandbox's Node-based Vitest run can't provide. See `docs/RUNNER_SPIKE.md`.
