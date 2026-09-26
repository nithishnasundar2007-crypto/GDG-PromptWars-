// Owner: Suchit. The M0 "first task" from the PRD (§7.5) and the Team Plan
// ("Confirm Pyodide and sql.js load inside the build tool — first task"):
// verifies both actually load, inside a real Web Worker, bundled by Vite —
// not just that the CDN URLs resolve in a plain script tag.

import type { LoadCheckResult } from "./pyodideWorker";

export interface RunnerLoadStatus {
  pyodide: boolean;
  sqlJs: boolean;
  timedOut: boolean;
  pyodideError?: string;
  sqlJsError?: string;
}

export function verifyRunnerLoads(timeoutMs = 30_000): Promise<RunnerLoadStatus> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("./pyodideWorker.ts", import.meta.url), { type: "module" });

    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ pyodide: false, sqlJs: false, timedOut: true });
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent<LoadCheckResult>) => {
      if (e.data?.type !== "load-check-result") return;
      clearTimeout(timer);
      worker.terminate();
      resolve({
        pyodide: e.data.pyodide,
        sqlJs: e.data.sqlJs,
        timedOut: false,
        pyodideError: e.data.pyodideError,
        sqlJsError: e.data.sqlJsError,
      });
    };

    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ pyodide: false, sqlJs: false, timedOut: false });
    };

    worker.postMessage({ type: "load-check" });
  });
}
