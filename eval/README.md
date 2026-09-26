# Eval (owner: Suchit)

30 hand-labelled answers + `runEval`, measuring against PRD §8.4's targets:

| Metric | Target |
| --- | --- |
| Grader–human agreement | ≥ 85% |
| False-award rate | ≤ 5% |
| False-reject rate | ≤ 10% |

Run on demand (`npm run eval` — TODO once `runEval` exists), never on every PR,
since it costs real Gemini API calls (docs/PHASE0_AUDIT.md section N).

- `labelled-answers/` — the 30 hand-labelled answers (not created yet — M1).
- `results/` — `runEval`'s output, one file per run, for tracking whether
  Verifier-prompt tuning is moving the needle.
- `runEval.ts` — not created yet; M1. Signature per API Contract §3.2:
  `runEval(labelled: LabelledAnswer[]): { agreement, falseAwardRate, falseRejectRate }`.
