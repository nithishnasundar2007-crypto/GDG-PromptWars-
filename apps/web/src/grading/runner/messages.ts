// PRD §7.5 — the runner Worker message protocol. One message runs ALL tests
// for a submission (hard rule §3.3: "never spin up a worker per test"); the
// worker reports progress after each test so the main thread can drive a
// per-test timeout without needing one Worker per test.

import type { Lang, TestCase, TestResult } from "../../contracts";

export interface InitMessage {
  type: "init";
  interruptBuffer?: Int32Array;
}

export interface PreloadMessage {
  type: "preload";
  runId: string;
  lang: Lang;
}

export interface PreloadResultMessage {
  type: "preload-result";
  runId: string;
  ready: boolean;
  error?: string;
}

export interface RunRequestMessage {
  type: "run";
  runId: string;
  code: string;
  lang: Lang;
  tests: TestCase[];
}

export interface TestProgressMessage {
  type: "test-progress";
  runId: string;
  completedCount: number;
}

export interface RunResponseMessage {
  type: "run-result";
  runId: string;
  results: TestResult[];
  runtimeMs: number;
}

export interface WorkerErrorMessage {
  type: "worker-error";
  runId: string;
  message: string;
}

export type WorkerRequest = InitMessage | PreloadMessage | RunRequestMessage;
export type WorkerResponse = PreloadResultMessage | TestProgressMessage | RunResponseMessage | WorkerErrorMessage;

/** Values written into the shared interrupt buffer (Pyodide's own convention: 2 = SIGINT). */
export const INTERRUPT_SIGINT = 2;
export const INTERRUPT_NONE = 0;
