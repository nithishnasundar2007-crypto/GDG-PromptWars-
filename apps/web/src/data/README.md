# Seed bank (owner: Uthai)

- `companies/*.json` — sprint scope: one company, three rounds. `companies/two-week/*.json` — two-week scope: Zoho (extended) and Freshworks.
- `topics.json` — sprint topics (Graphs, SQL Joins, Project Explanation, Behavioural). `topics.two-week.json` — the 8 extra two-week topics (12 in total).
- `questions/<topic>/*.json` — one file per `Question`. Every ladder topic has a `probe`, `confirm` and `retest` question. Ids ending in `_drill` are drill-only practice questions and are never asked in a ladder.
- `drills/templates.json` — drill text per (topic, gap type), with a generic fallback per gap type (`topicId: null`). `drills/gap-kinds.json` maps gap type to drill kind.
- `approaches.json` — the approach revealed when the Hint step fails, keyed by question id.
- `debrief-keywords.json` — keywords used to match a logged interview question to a topic.

Test-case convention (to be agreed with grading, see the hand-off notes): Python
`input` is a JSON array of the function's arguments and `expected` is the JSON
of the return value; SQL `input` is a setup script (schema + rows) and
`expected` is the JSON array of result rows, so every SQL question orders its output.

Only the sprint topics have questions so far. The eight extra two-week topics
are defined but have no questions yet, and the planner skips topics without
questions. Run `npm run validate-seeds` from the repo root to check shape and coverage.
