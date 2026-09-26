// Owner: Shruthi. S1 Setup (UI/UX Specs §S1) — company, drive date, hours
// per day, in under 30 seconds; preloads the runner while the student types.
//
// M0 scope: the runner-preload behaviour only (this is the PRD's day-one
// risk check — "Confirm Pyodide and sql.js load inside the chosen build
// tool"). The company/date/hours form + createStudent() wiring is M1.
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { verifyRunnerLoads, type RunnerLoadStatus } from "../../../lib/api/runnerDiagnostics";

type RunnerStatus = "checking" | "ready" | "failed";

export function SetupScreen() {
  const [status, setStatus] = useState<RunnerStatus>("checking");
  const [detail, setDetail] = useState<RunnerLoadStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    void api.initRunner(); // contract call — mocked "ready" until M1's real runner exists

    void verifyRunnerLoads().then((result) => {
      if (cancelled) return;
      setDetail(result);
      setStatus(result.pyodide && result.sqlJs ? "ready" : "failed");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <h1>1. Setup</h1>
      <p>Owner: Shruthi · PRD feature: F1/F2</p>
      <p>
        Code runner:{" "}
        {status === "checking" && "getting ready…"}
        {status === "ready" && "ready"}
        {status === "failed" && "failed to load — see console"}
      </p>
      {detail && (
        <ul className="mono" style={{ fontSize: 12 }}>
          <li>Pyodide: {detail.pyodide ? "loaded" : `failed${detail.pyodideError ? ` (${detail.pyodideError})` : ""}`}</li>
          <li>sql.js: {detail.sqlJs ? "loaded" : `failed${detail.sqlJsError ? ` (${detail.sqlJsError})` : ""}`}</li>
          {detail.timedOut && <li>Load check timed out.</li>}
        </ul>
      )}
      <p>Company / drive date / hours-per-day form is M1 work — not built yet.</p>
    </section>
  );
}
