/// <reference lib="webworker" />
// PRD §7.5 — runs Python student code inside Pyodide, entirely inside this
// Worker. Sandbox rules (hard rule §3.2):
//  - loaded once per session (idempotent — a second call to `loadPython`
//    returns the same in-flight/resolved promise);
//  - `fetch`/`XMLHttpRequest`/`importScripts` are removed from this worker's
//    global scope right after Pyodide finishes loading (Pyodide itself needs
//    them during load, so this can't happen earlier);
//  - a `sys.meta_path` finder blocks `import js`, `import pyodide_js`,
//    `import pyodide`, and `import micropip` from student code;
//  - each test runs against a FRESH globals dict, so state never leaks
//    between tests in the same submission;
//  - stdout/stderr are captured and capped at RUNNER_OUTPUT_CAP_BYTES.
//
// Served from the pinned `pyodide` npm package, same-origin (see
// vite.config.ts's static-copy of its assets to /pyodide/), never a CDN.

import type { TestCase, TestResult } from "../../contracts";
import { RUNNER_OUTPUT_CAP_BYTES } from "../config";
import { outputsMatch } from "./compare";

// Minimal shape of what we actually use from Pyodide's API — the full
// PyodideInterface type is large and mostly irrelevant here.
interface PyodideInstance {
  runPythonAsync: (code: string, options?: { globals?: unknown }) => Promise<unknown>;
  runPython: (code: string, options?: { globals?: unknown }) => unknown;
  globals: { get: (name: string) => unknown };
  toPy: (value: unknown) => unknown;
  setInterruptBuffer: (buffer: Int32Array) => void;
  setStdout: (options: { batched: (msg: string) => void }) => void;
  setStderr: (options: { batched: (msg: string) => void }) => void;
}

let pyodidePromise: Promise<PyodideInstance> | undefined;

function lockDownWorkerGlobals(): void {
  const globalScope = self as unknown as Record<string, unknown>;
  // Pyodide needs these during its own load; removing them only afterwards
  // still blocks student code (which only ever runs after load completes)
  // from reaching the network via the worker's JS globals.
  globalScope.fetch = undefined;
  globalScope.XMLHttpRequest = undefined;
  globalScope.importScripts = undefined;
}

const BLOCKED_PY_IMPORTS = new Set(["js", "pyodide", "pyodide_js", "micropip"]);

/** Installs a sys.meta_path finder that raises ImportError for blocked modules. */
const INSTALL_IMPORT_GUARD = `
import sys

class _CompassImportGuard:
    def find_module(self, name, path=None):
        if name in ${JSON.stringify(Array.from(BLOCKED_PY_IMPORTS))}:
            raise ImportError(f"import of '{name}' is blocked in this sandbox")
        return None

if not any(isinstance(f, _CompassImportGuard) for f in sys.meta_path):
    sys.meta_path.insert(0, _CompassImportGuard())
`;

export async function loadPython(interruptBuffer?: Int32Array): Promise<PyodideInstance> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const { loadPyodide } = (await import(/* @vite-ignore */ "pyodide")) as unknown as {
        loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInstance>;
      };
      const pyodide = await loadPyodide({ indexURL: "/pyodide/" });
      lockDownWorkerGlobals();
      if (interruptBuffer) pyodide.setInterruptBuffer(interruptBuffer);
      await pyodide.runPythonAsync(INSTALL_IMPORT_GUARD);
      return pyodide;
    })();
  }
  return pyodidePromise;
}

/** Reduces a raw Python traceback to "ErrorType on line N: message" (accessibility rule §3.5). */
function reduceTraceback(raw: string): string {
  const lines = raw.trim().split("\n");
  const last = lines[lines.length - 1] ?? raw;
  const lineMatch = [...raw.matchAll(/line (\d+)/g)].pop();
  const lineNumber = lineMatch ? `on line ${lineMatch[1]}: ` : "";
  const colonIndex = last.indexOf(":");
  if (colonIndex === -1) return last;
  const errorType = last.slice(0, colonIndex).trim();
  const message = last.slice(colonIndex + 1).trim();
  return `${errorType} ${lineNumber}${message}`.replace("  ", " ").trim();
}

function capOutput(text: string): string {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= RUNNER_OUTPUT_CAP_BYTES) return text;
  return new TextDecoder().decode(bytes.slice(0, RUNNER_OUTPUT_CAP_BYTES)) + "\n... (output truncated)";
}

/**
 * Runs `code` against one test's input in a fresh globals dict, capturing
 * stdout as the actual output. `code` is expected to define a solution the
 * question's harness invokes; the exact call convention is question-specific
 * and supplied via `harnessCode` (built by the caller from the test's input).
 */
export async function runOneTest(pyodide: PyodideInstance, code: string, test: TestCase): Promise<TestResult> {
  let stdout = "";
  let stderr = "";
  pyodide.setStdout({ batched: (msg) => (stdout += msg + "\n") });
  pyodide.setStderr({ batched: (msg) => (stderr += msg + "\n") });

  const globals = pyodide.toPy({});
  try {
    await pyodide.runPythonAsync(`${code}\n\n${test.input}`, { globals });
    const actual = capOutput(stdout.trim());
    const passed = outputsMatch(actual, test.expected);
    return {
      testId: test.id,
      passed,
      timedOut: false,
      ...(test.hidden ? {} : { input: test.input, expected: test.expected, actual }),
      ...(!passed && !test.hidden ? { error: `Expected ${test.expected}, but got ${actual}` } : {}),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isInterrupt = message.includes("KeyboardInterrupt");
    return {
      testId: test.id,
      passed: false,
      timedOut: isInterrupt,
      ...(isInterrupt ? {} : { error: reduceTraceback(capOutput(message)) }),
    };
  }
}
