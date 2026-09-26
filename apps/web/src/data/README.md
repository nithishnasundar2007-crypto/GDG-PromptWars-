# Seed bank (owner: Uthai)

- `companies/*.json` — one file per company, shaped like `Company` (contracts/types.ts).
- `topics.json` — every `Topic` referenced by any company or question.
- `questions/<topic>/*.json` — one file per question, shaped like `Question`.
- `drills/*.json` — not yet started; shaped like `Drill`, keyed by `gapType`.

Only `q_bfs_probe` (graphs, role `probe`) exists so far, as a worked example of
the shape. Per the PRD's sprint scope (§8.1) and `scripts/validate-seeds`,
every in-scope topic-step needs a `probe`, `confirm` and `retest` question —
that curation (with rubrics, hint, variant and hidden tests hand-checked) is
Uthai's M1 work, not something this scaffold invents.

Run `npm run validate-seeds` from the repo root to check shape + coverage.
