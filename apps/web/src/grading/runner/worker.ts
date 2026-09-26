/// <reference lib="webworker" />
// PRD §7.5 — the runner Worker entry point. One "run" message executes every
// test for one submission (hard rule §3.3), reporting progress after each so
// the main thread (runner-client.ts) can drive a per-test timeout without
// spawning a worker per test.

import { loadPython, runOneTest } from "./python-host";
import { loadSqlJs, runOneSqlTest } from "./sql-host";
import type { TestResult } from "../../contracts";
import type { PreloadMessage, RunRequestMessage, TestProgressMessage, WorkerRequest, WorkerResponse } from "./messages";

let interruptBuffer: Int32Array | undefined;

function post(message: WorkerResponse): void {
  (self as unknown as Worker).postMessage(message);
}

async function handlePreload(request: PreloadMessage): Promise<void> {
  try {
    if (request.lang === "python") await loadPython(interruptBuffer);
    else await loadSqlJs();
    post({ type: "preload-result", runId: request.runId, ready: true });
  } catch (e) {
    post({ type: "preload-result", runId: request.runId, ready: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function handleRun(request: RunRequestMessage): Promise<void> {
  const start = Date.now();
  const results: TestResult[] = [];
  let earlierTimedOut = false;

  try {
    if (request.lang === "python") {
      const pyodide = await loadPython(interruptBuffer);
      for (const test of request.tests) {
        if (earlierTimedOut) {
          results.push({ testId: test.id, passed: false, timedOut: false, error: "Not run: an earlier test timed out" });
          continue;
        }
        if (interruptBuffer) interruptBuffer[0] = 0; // clear any stale interrupt signal
        const result = await runOneTest(pyodide, request.code, test);
        if (result.timedOut) earlierTimedOut = true;
        results.push(result);
        post({ type: "test-progress", runId: request.runId, completedCount: results.length } satisfies TestProgressMessage);
      }
    } else {
      const sqlJs = await loadSqlJs();
      for (const test of request.tests) {
        if (earlierTimedOut) {
          results.push({ testId: test.id, passed: false, timedOut: false, error: "Not run: an earlier test timed out" });
          continue;
        }
        const result = await runOneSqlTest(sqlJs, request.code, test);
        results.push(result);
        post({ type: "test-progress", runId: request.runId, completedCount: results.length } satisfies TestProgressMessage);
      }
    }
    post({ type: "run-result", runId: request.runId, results, runtimeMs: Date.now() - start });
  } catch (e) {
    post({ type: "worker-error", runId: request.runId, message: e instanceof Error ? e.message : String(e) });
  }
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const message = e.data;
  if (message.type === "init") {
    interruptBuffer = message.interruptBuffer;
    return;
  }
  if (message.type === "run") {
    void handleRun(message);
  }
  if (message.type === "preload") {
    void handlePreload(message);
  }
};
