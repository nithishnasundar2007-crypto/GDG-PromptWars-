# Runner I/O convention

How `TestCase.input`/`TestCase.expected` (API Contract §2.2) are interpreted
by `grading/runner/python-host.ts` and `grading/runner/sql-host.ts`. This
convention did not exist before this task; it's defined here so seed
question authors (Uthai) know exactly what shape to write hidden tests in.

## Python (`lang: "python"`)

- `input`: a Python snippet, executed **after** the student's submitted code
  in the same fresh globals dict. It should call whatever function/class the
  question asks the student to define, and `print(...)` the result.
- `expected`: the exact expected stdout (trailing whitespace/newlines are
  ignored by `compare.ts`'s `outputsMatch`; nothing else is).

Example, for a question whose starter code defines
`def shortest_path(graph, start, target): ...`:

```json
{
  "id": "t2",
  "input": "GRAPH = {'a': ['b'], 'b': ['c'], 'c': []}\nprint(shortest_path(GRAPH, 'a', 'c'))",
  "expected": "2",
  "hidden": true
}
```

If the student's code raises an exception while running `input`, the test
fails with `error` set to a reduced traceback (`"IndexError on line 7: list
index out of range"` — never a raw Python traceback, per the accessibility
rule). If it runs past `RUNNER_TEST_TIMEOUT_MS`, the test fails with
`timedOut: true`.

## SQL (`lang: "sql"`)

- `input`: setup SQL (schema + seed data), run against a **fresh** database
  before the student's query. Typically `CREATE TABLE ...; INSERT INTO ...;`.
- The student's submitted `code` is the query itself, run via `db.exec(...)`
  against that freshly-seeded database.
- `expected`: the exact expected result, formatted as `outputsMatch` compares
  it — a header row of column names, then one comma-joined row per line (see
  `sql-host.ts`'s `formatResult`).

Example:

```json
{
  "id": "t1",
  "input": "CREATE TABLE users (id INT, name TEXT); INSERT INTO users VALUES (1, 'Ana'), (2, 'Bo');",
  "expected": "name\nAna\nBo",
  "hidden": false
}
```

## Visible vs. hidden

`runSample` (used for the visible Apply/Transfer tests shown to the student
while they work) filters to `tests.filter(t => !t.hidden)`. `runCode` (used
for the final graded submission) runs everything passed to it — callers
(engine/session, once built) are responsible for passing the full test list,
visible + hidden, at submission time. Per API Contract §2.3's
`TestResult.error` doc comment, only the first hidden failure gets its
`error` field filled in; `python-host.ts`/`sql-host.ts` only omit
`input`/`expected`/`actual` for hidden tests (never the pass/fail verdict
itself).

## Known gap against the current seed bank

`apps/web/src/data/questions/graphs/bfs-shortest-path.json` (the only real
seed question as of this task) does **not** follow this convention yet —
its `tests[].input` values are human-readable descriptions ("small graph,
adjacent nodes"), not executable Python. This is a real, actionable item for
whoever owns seed authoring next (see the handoff note in
`docs/BACKEND1_REPORT.md`), not something this implementation can silently
paper over, since the runner has no way to execute a natural-language
description.
