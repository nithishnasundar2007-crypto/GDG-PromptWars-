/// <reference lib="webworker" />
// PRD §7.5 — runs SQL student code inside sql.js, entirely inside this
// Worker. A FRESH sql.js database is created per test (hard rule §3.2:
// "fresh sql.js database for each SQL test"), lazily initialised on first
// SQL run (hard rule §3.3), served from the pinned `sql.js` npm package
// (never a CDN) via vite.config.ts's static-copy of its wasm to /sqljs/.

import type { TestCase, TestResult } from "../../contracts";
import { RUNNER_OUTPUT_CAP_BYTES } from "../config";
import { outputsMatch } from "./compare";

interface SqlJsDatabase {
  run: (sql: string) => void;
  exec: (sql: string) => { columns: string[]; values: unknown[][] }[];
  close: () => void;
}
interface SqlJsStatic {
  Database: new () => SqlJsDatabase;
}

let sqlJsPromise: Promise<SqlJsStatic> | undefined;

export async function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = (async () => {
      const initSqlJs = ((await import(/* @vite-ignore */ "sql.js")) as { default: (opts: { locateFile: (f: string) => string }) => Promise<SqlJsStatic> }).default;
      return initSqlJs({ locateFile: () => "/sqljs/sql-wasm.wasm" });
    })();
  }
  return sqlJsPromise;
}

function capOutput(text: string): string {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= RUNNER_OUTPUT_CAP_BYTES) return text;
  return new TextDecoder().decode(bytes.slice(0, RUNNER_OUTPUT_CAP_BYTES)) + "\n... (output truncated)";
}

function formatResult(rows: { columns: string[]; values: unknown[][] }[]): string {
  const first = rows[0];
  if (!first) return "";
  const lines = first.values.map((row) => row.map(String).join(","));
  return [first.columns.join(","), ...lines].join("\n");
}

/**
 * Runs `code` (the student's SQL, per the RUNNER_IO.md convention: `input`
 * is the fixture-setup SQL, run against a fresh database before `code`) for
 * one test. A syntax/runtime SQL error becomes a failed TestResult, never an
 * API error.
 */
// sql.js's Database#run/#exec are synchronous — this stays a plain function
// (not `async`) since it has no real await, but keeps a Promise-returning
// signature so worker.ts can await it uniformly alongside the Python path.
export function runOneSqlTest(sqlJs: SqlJsStatic, code: string, test: TestCase): Promise<TestResult> {
  const db = new sqlJs.Database();
  try {
    db.run(test.input);
    const rows = db.exec(code);
    const actual = capOutput(formatResult(rows));
    const passed = outputsMatch(actual, test.expected);
    return Promise.resolve({
      testId: test.id,
      passed,
      timedOut: false,
      ...(test.hidden ? {} : { input: test.input, expected: test.expected, actual }),
      ...(!passed && !test.hidden ? { error: `Expected ${test.expected}, but got ${actual}` } : {}),
    });
  } catch (e) {
    return Promise.resolve({ testId: test.id, passed: false, timedOut: false, error: e instanceof Error ? e.message : String(e) });
  } finally {
    db.close();
  }
}
