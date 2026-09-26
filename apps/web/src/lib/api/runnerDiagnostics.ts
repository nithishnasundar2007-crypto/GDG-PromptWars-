// M0 diagnostic only: whether Pyodide + sql.js load inside this build tool
// (PRD §7.5's day-one check). Not part of CompassApi — the Setup screen
// (S1) uses this once, alongside api.initRunner(), to show "Code runner:
// getting ready… / ready" per UI/UX Specs §S1. Routed through lib/ rather
// than exposed to screens directly, so the "screens never import grading/*"
// rule (docs/PHASE0_AUDIT.md section G) still holds without exception.
export { verifyRunnerLoads, type RunnerLoadStatus } from "../../grading";
