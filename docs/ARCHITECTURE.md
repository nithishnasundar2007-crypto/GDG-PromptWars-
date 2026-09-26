# Compass — Architecture

See `docs/PHASE0_AUDIT.md` for the full audit and the reasoning behind every
decision below; this file is the living reference, kept short.

## Domains

| Domain | Owner | Talks to Gemini? | Talks to storage? |
| --- | --- | --- | --- |
| `grading/` | Suchit | Yes — only via `grading/ai` | No |
| `engine/` | Uthai | No, never | Yes — only via `engine/store`'s `Repository` |
| `shell/`, `screens/*` | Shruthi, Reshma | No | No — only via `lib/api` |
| `apps/ai-proxy` | Suchit | Yes — holds `GEMINI_API_KEY` | No |

## Call flow

```
Screen component → hook → lib/api → engine or grading public index
```

Screens import only `lib/api`, `contracts`, and `shell` (layout). They never
import `engine/*` or `grading/*` directly — enforced by ESLint
(`apps/web/eslint.config.js`), not just convention.

## What code decides vs. what the AI does

Code decides wherever an objective check exists — this is non-negotiable
(PRD §7, "Authoritative rules" in the brief):

1. Apply/Transfer pass only if every hidden test passes (`grading/runner`).
2. A rubric point is met only if every Grader span passes `matchQuote`
   (`grading/quote`) **and** the Verifier says yes.
3. A step passes only if all required points are met.
4. Ladder transitions follow the PRD §3.1 table exactly, stored as DATA in
   `engine/ladder`.
5. Gaps start suspected, confirm only on a second failure, fix only on a
   clean pass or a passed re-test on a fresh question (`engine/gaps`).
6. The planner follows PRD §7.3 (`engine/planner`).
7. Grammar, spelling and language mix are never graded.

The LLM (via `grading/ai` → `apps/ai-proxy` → Gemini) only: generates spans
for a rubric point (Grader), answers yes/no on one point (Verifier), writes
four-part feedback (Explainer), and drafts Project Defense questions. It
never decides a ladder move, a gap's status, a cell's colour, or the plan.

## Folder purposes

See `docs/PHASE0_AUDIT.md` section E for the full annotated tree.

## AI architecture

```
grading/pipeline (gradeStep, explain)
grading/project  (generateProjectQuestions, gradeProjectAnswer)
grading/transcribe (transcribe)
        │  all three call:
        ▼
grading/ai  (AIService.generate — prompt registry lookup, one retry, zod validation)
        │  the ONLY module that fetches the proxy
        ▼
apps/ai-proxy  (holds GEMINI_API_KEY, checks ALLOWED_ORIGIN, rate-limits, calls Gemini)
```

`GEMINI_API_KEY` exists only in `apps/ai-proxy`'s environment. It is never a
`VITE_`-prefixed variable, so Vite never inlines it into the browser bundle;
CI additionally greps the built bundle for the literal key value
(`scripts/check-bundle-key.mjs`) as a second line of defence.
