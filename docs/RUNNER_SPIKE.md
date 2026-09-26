# Runner spike — what's real, what's untested, and why

## What was actually verified in this sandbox

- **Build/bundling**: `npm run build -w web` succeeds. Vite bundles
  `runner/worker.ts` into its own chunk (`assets/worker-*.js`), confirming
  the Worker module graph (python-host.ts, sql-host.ts, messages.ts,
  compare.ts) is well-formed and importable.
- **Asset copying**: `vite-plugin-static-copy` copies 14 files from the
  pinned `pyodide` npm package and `sql.js`'s wasm binary into
  `dist/pyodide/` and `dist/sqljs/` on every build — confirmed by inspecting
  the build output directly (`npm run build` logs "Copied 14 items.").
- **All non-Worker logic**: input-limit validation, question lookup via
  `configureGrading`, the code-step/rubric-step dispatch in
  `runner/index.ts`, and the output-comparison logic (`compare.ts`) are
  covered by real Vitest unit tests with the Worker itself mocked (see
  `grading/runner/index.test.ts`, `grading/runner/compare.test.ts`).
- **TypeScript correctness**: `tsc -b` passes with `strict`,
  `noUncheckedIndexedAccess`, `noImplicitOverride` across the whole runner
  module, including the Worker-only files (`python-host.ts`, `sql-host.ts`,
  `worker.ts` all reference `self`/`Worker`/`postMessage` correctly per the
  `webworker` lib triple-slash reference).

## What could NOT be verified end-to-end here, and why

This sandbox's test runner (`vitest`, `environment: "node"`) has no real
browser and no `Worker` global. Actually loading Pyodide inside a real Web
Worker, running Python against it, and observing the `SharedArrayBuffer`
interrupt path all require a live browser — Vitest's `jsdom`/`happy-dom`
environments don't implement Workers realistically enough to exercise a
`new Worker(new URL(...))` construction with `pyodide.loadPyodide()` inside
it, and there's no headless-browser tooling available in this environment to
fall back to.

Concretely, **not exercised**, though the code for each is written for real
(not a stub) and reviewed by hand against Pyodide/sql.js's documented APIs:

1. **Pyodide load time** — can't be measured here. In a real browser, first
   load is typically several seconds (fetching `pyodide.asm.wasm` and
   `python_stdlib.zip`, both served from `/pyodide/` per `vite.config.ts`);
   subsequent runs in the same tab are instant because `loadPython()` caches
   the resolved promise (`pyodidePromise`), matching the idempotency rule.
2. **The `sys.meta_path` import guard** (`python-host.ts`'s
   `INSTALL_IMPORT_GUARD`) — written against Pyodide's documented `sys`
   module behavior (CPython's own `sys.meta_path` protocol), but never
   actually run against a live Pyodide interpreter to confirm
   `import js` / `import pyodide_js` / `import micropip` are blocked as
   intended.
3. **The `SharedArrayBuffer` interrupt path** (`runner-client.ts`'s
   `armPerTestTimer` writing `INTERRUPT_SIGINT` into the shared buffer,
   `python-host.ts`'s `loadPython` calling `pyodide.setInterruptBuffer`) —
   this needs COOP/COEP response headers (configured for `npm run dev` in
   `vite.config.ts`'s `server.headers`, and for production in
   `firebase.json`'s hosting headers) for `SharedArrayBuffer` to even exist
   in the page. Never confirmed that Pyodide actually raises
   `KeyboardInterrupt` in response to the buffer write within
   `RUNNER_TEST_TIMEOUT_MS`.
4. **The terminate+respawn fallback** — the code path
   (`runner-client.ts`'s `respawnWorker` after the interrupt grace period)
   is written and typechecks, but "the worker didn't recover in time" was
   never actually observed happening.
5. **sql.js's fresh-database-per-test isolation** — written per sql.js's
   documented `new SQL.Database()` API, never run against the real wasm
   binary.

## The RUNNER_IO.md convention gap (handoff to Uthai)

The runner's `TestCase.input`/`expected` convention this implementation
assumes (see `docs/RUNNER_IO.md`) is: `input` is a Python/SQL snippet that,
appended after the student's code, invokes the target function/query and
prints its result; `expected` is the expected stdout. The **existing** seed
question (`apps/web/src/data/questions/graphs/bfs-shortest-path.json`) does
NOT follow this convention yet — its `tests[].input` fields are
human-readable descriptions ("small graph, adjacent nodes"), not executable
snippets. This is flagged as a real, actionable gap for Uthai's seed
authoring, not glossed over — see the handoff note in
`docs/BACKEND1_REPORT.md`.

## Bottom line

The runner's message protocol, sandboxing logic, timeout/recovery strategy,
and non-Worker business logic are implemented for real and typecheck/lint
clean, per this task's instruction to keep going rather than leave it
unimplemented. What's honestly unverified is anything that requires an
actual browser Worker executing actual WASM — which this sandbox cannot
provide. A real verification pass (load-time measurement, import-guard
confirmation, interrupt-buffer timing) needs to happen in a real browser
before this is trusted for a live demo.
