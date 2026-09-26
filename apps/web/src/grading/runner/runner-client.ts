// PRD §7.5 — main-thread runner client. Owns the one Worker instance
// (idempotent creation/preload — hard rule §3.3), drives per-test timeouts
// via the interrupt buffer with a terminate+respawn fallback, and never
// spins up more than one Worker per submission.

import type { Lang, RunResult, TestCase } from "../../contracts";
import { RUNNER_TEST_TIMEOUT_MS, RUNNER_TOTAL_TIMEOUT_MS } from "../config";
import { GradingError } from "../errors";
import { INTERRUPT_SIGINT } from "./messages";
import type { WorkerResponse } from "./messages";

const INTERRUPT_GRACE_MS = 1_000;

let worker: Worker | undefined;
let interruptBuffer: Int32Array | undefined;
let preloadPromise: Promise<void> | undefined;

function supportsSharedArrayBuffer(): boolean {
  return typeof SharedArrayBuffer !== "undefined";
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    interruptBuffer = supportsSharedArrayBuffer() ? new Int32Array(new SharedArrayBuffer(4)) : undefined;
    worker.postMessage({ type: "init", interruptBuffer });
  }
  return worker;
}

function respawnWorker(): void {
  worker?.terminate();
  worker = undefined;
  preloadPromise = undefined;
  // Respawned lazily on the next call — "respawn in the background" per the
  // hard rule means the next caller gets a fresh, already-initialising
  // worker rather than a broken one, not that we must eagerly reload Pyodide
  // with nobody asking for it yet.
}

/**
 * Idempotently preloads Pyodide (or sql.js) in the runner Worker. Safe to
 * call multiple times — returns the same in-flight/resolved promise.
 */
export function preload(lang: Lang): Promise<{ ready: boolean }> {
  if (!preloadPromise) {
    const w = getWorker();
    const runId = crypto.randomUUID();
    preloadPromise = new Promise<void>((resolve, reject) => {
      const onMessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.type !== "preload-result" || e.data.runId !== runId) return;
        w.removeEventListener("message", onMessage);
        if (e.data.ready) resolve();
        else reject(new GradingError("RUNNER_NOT_READY", e.data.error ?? "Runner failed to load"));
      };
      w.addEventListener("message", onMessage);
      w.postMessage({ type: "preload", runId, lang });
    });
  }
  return preloadPromise.then(
    () => ({ ready: true }),
    () => ({ ready: false }),
  );
}

/** Runs `tests` against `code` in the runner Worker, with per-test timeout and recovery. */
export function runInWorker(code: string, lang: Lang, tests: TestCase[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const runId = crypto.randomUUID();
    let perTestTimer: ReturnType<typeof setTimeout> | undefined;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    function clearTimers(): void {
      if (perTestTimer) clearTimeout(perTestTimer);
      if (graceTimer) clearTimeout(graceTimer);
    }

    function armPerTestTimer(): void {
      if (perTestTimer) clearTimeout(perTestTimer);
      perTestTimer = setTimeout(() => {
        // First try a cooperative interrupt (requires SharedArrayBuffer +
        // COOP/COEP — see docs/RUNNER_SPIKE.md for why this can't be
        // exercised end-to-end in this sandbox).
        if (interruptBuffer) interruptBuffer[0] = INTERRUPT_SIGINT;
        graceTimer = setTimeout(() => {
          // The worker didn't recover in time even after the interrupt —
          // terminate and respawn (hard rule §3.3 fallback path), and report
          // whatever the caller was waiting on as a total failure since we
          // can no longer trust partial state from this run.
          respawnWorker();
          reject(new GradingError("RUN_TIMEOUT", "The code runner stopped responding and was restarted."));
        }, INTERRUPT_GRACE_MS);
      }, RUNNER_TEST_TIMEOUT_MS);
    }

    const totalTimer = setTimeout(() => {
      clearTimers();
      respawnWorker();
      reject(new GradingError("RUN_TIMEOUT", "The run took too long overall and was stopped."));
    }, RUNNER_TOTAL_TIMEOUT_MS);

    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      const message = e.data;
      if ("runId" in message && message.runId !== runId) return;

      if (message.type === "test-progress") {
        armPerTestTimer();
        return;
      }
      if (message.type === "run-result") {
        clearTimeout(totalTimer);
        clearTimers();
        w.removeEventListener("message", onMessage);
        const firstFailure = message.results.find((r) => !r.passed);
        resolve({
          passed: message.results.every((r) => r.passed),
          results: message.results,
          runtimeMs: message.runtimeMs,
          ...(firstFailure ? { firstFailure } : {}),
        });
        return;
      }
      if (message.type === "worker-error") {
        clearTimeout(totalTimer);
        clearTimers();
        w.removeEventListener("message", onMessage);
        reject(new GradingError("RUNNER_NOT_READY", message.message));
      }
    };

    w.addEventListener("message", onMessage);
    armPerTestTimer();
    w.postMessage({ type: "run", runId, code, lang, tests });
  });
}
