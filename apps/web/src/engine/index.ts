// Owner: Uthai. The ONLY import path other domains (lib/api, screens) may
// use into engine/. Internals (ladder, gaps, readiness, planner, drills,
// session, store, debrief, content) are not imported directly from outside
// this folder.

export { nextStep, TECHNICAL_TRANSITIONS, HR_TRANSITIONS } from "./ladder";
export { updateGaps, isSlow, DEFAULT_SLOW_FACTOR, type GapOutcome } from "./gaps";
export { getCompanies, getRoundMap } from "./content";
export { createReadinessModule } from "./readiness";
export { createPlannerModule } from "./planner";
export { createDrillsModule } from "./drills";
export { createSessionModule } from "./session";
export { createDebriefModule } from "./debrief";
export { InMemoryRepository, type Repository } from "./store";
export { EngineError, errorCodeOf } from "./errors";
export type { EngineDeps, GradeStepFn } from "./deps";
