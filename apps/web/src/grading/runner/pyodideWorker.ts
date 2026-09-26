/// <reference lib="webworker" />
// Owner: Suchit. Runs ONLY inside this Web Worker — student code and the
// runner's own heavy assets never touch the main thread (PRD 7.5 / security
// rule: student code runs only in the Web Worker, with a per-run timeout).
//
// This worker currently answers one question for M0: do Pyodide and sql.js
// actually load from a CDN inside Vite's worker bundling? Full runCode/
// runSample (hidden tests, per-run timeout) is Suchit's M1 work on top of
// this file.

export interface LoadCheckResult {
  type: "load-check-result";
  pyodide: boolean;
  sqlJs: boolean;
  pyodideError?: string;
  sqlJsError?: string;
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const SQLJS_VERSION = "1.11.0";

async function checkPyodide(): Promise<{ ok: boolean; error?: string }> {
  try {
    const mod = (await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`)) as {
      loadPyodide: (opts: { indexURL: string }) => Promise<{ runPython: (code: string) => unknown }>;
    };
    const pyodide = await mod.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    const result = pyodide.runPython("1 + 1");
    return { ok: result === 2 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkSqlJs(): Promise<{ ok: boolean; error?: string }> {
  try {
    const mod = (await import(
      /* @vite-ignore */ `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/+esm`
    )) as {
      default: (opts: { locateFile: (file: string) => string }) => Promise<{
        Database: new () => {
          run: (sql: string) => void;
          exec: (sql: string) => unknown[];
          close: () => void;
        };
      }>;
    };
    const SQL = await mod.default({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/${file}`,
    });
    const db = new SQL.Database();
    db.run("CREATE TABLE t (x INT); INSERT INTO t VALUES (1);");
    const result = db.exec("SELECT * FROM t");
    db.close();
    return { ok: Array.isArray(result) && result.length === 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

self.onmessage = async (e: MessageEvent<{ type: string }>) => {
  if (e.data.type !== "load-check") return;
  const [pyodide, sqlJs] = await Promise.all([checkPyodide(), checkSqlJs()]);
  const message: LoadCheckResult = {
    type: "load-check-result",
    pyodide: pyodide.ok,
    sqlJs: sqlJs.ok,
    ...(pyodide.error !== undefined ? { pyodideError: pyodide.error } : {}),
    ...(sqlJs.error !== undefined ? { sqlJsError: sqlJs.error } : {}),
  };
  (self as unknown as Worker).postMessage(message);
};
