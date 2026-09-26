// The ONLY module screens ever import for data. Routes every one of the 17
// functions to either contracts/mocks.ts or the real engine/grading
// implementation, keyed on VITE_USE_MOCKS. Screens never import engine/* or
// grading/* directly (UI/UX Specs + the architect brief's frontend rules).

import type { CompassApi, ErrorCode, Result } from "../../contracts";
import { mockApi } from "../../contracts";
import { config } from "../../config";
import {
  InMemoryRepository,
  createReadinessModule,
  createPlannerModule,
  createDrillsModule,
  createSessionModule,
  createDebriefModule,
  getCompanies,
  getRoundMap,
  errorCodeOf,
} from "../../engine";
import {
  initRunner,
  runSample,
  generateProjectQuestions,
  gradeProjectAnswer,
  transcribe,
} from "../../grading";
import { ok, err } from "../../contracts/errors";

// Engine errors carry their own contract code; anything else falls back to the given one.
function fail<T>(e: unknown, fallback: ErrorCode): Result<T> {
  return err(errorCodeOf(e, fallback), e instanceof Error ? e.message : undefined);
}

function buildRealApi(): CompassApi {
  const repo = new InMemoryRepository();
  const readiness = createReadinessModule(repo);
  const planner = createPlannerModule(repo);
  const drills = createDrillsModule(repo);
  const session = createSessionModule(repo);
  const debrief = createDebriefModule(repo);

  return {
    async initRunner() {
      try {
        return ok(await initRunner());
      } catch (e) {
        return err("RUNNER_NOT_READY", e instanceof Error ? e.message : undefined);
      }
    },
    async runSample(questionId, code, step) {
      try {
        return ok(await runSample(questionId, code, step));
      } catch (e) {
        return err("RUNNER_NOT_READY", e instanceof Error ? e.message : undefined);
      }
    },
    async getCompanies() {
      try {
        return ok(await getCompanies());
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async getRoundMap(companyId) {
      try {
        return ok(await getRoundMap(companyId));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async createStudent(input) {
      try {
        return ok(await session.createStudent(input));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async startLadder(studentId, topicId, role, step) {
      try {
        return ok(await session.startLadder(studentId, topicId, role, step));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async submitStep(ladderId, answer, timeMs) {
      try {
        return ok(await session.submitStep(ladderId, answer, timeMs));
      } catch (e) {
        return fail(e, "INVALID_STEP");
      }
    },
    async getReadinessMap(studentId) {
      try {
        return ok(await readiness.getReadinessMap(studentId));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async getCellEvidence(studentId, topicId, step) {
      try {
        return ok(await readiness.getCellEvidence(studentId, topicId, step));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async getPlan(studentId) {
      try {
        return ok(await planner.getPlan(studentId));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async getNextTask(studentId) {
      try {
        return ok(await planner.getNextTask(studentId));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async getDrill(gapId) {
      try {
        return ok(await drills.getDrill(gapId));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async completePlanItem(itemId, status) {
      try {
        return ok(await planner.completePlanItem(itemId, status));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
    async generateProjectQuestions(projectText) {
      try {
        return ok(await generateProjectQuestions(projectText));
      } catch (e) {
        return err("GEMINI_FAILED", e instanceof Error ? e.message : undefined);
      }
    },
    async gradeProjectAnswer(pq, projectText, answer) {
      try {
        return ok(await gradeProjectAnswer(pq, projectText, answer));
      } catch (e) {
        return err("GEMINI_FAILED", e instanceof Error ? e.message : undefined);
      }
    },
    async transcribe(audio) {
      try {
        return ok(await transcribe(audio));
      } catch (e) {
        return err("GEMINI_FAILED", e instanceof Error ? e.message : undefined);
      }
    },
    async saveDebrief(input) {
      try {
        return ok(await debrief.saveDebrief(input));
      } catch (e) {
        return fail(e, "NOT_FOUND");
      }
    },
  };
}

const realApi: CompassApi = buildRealApi();

export const api: CompassApi = config.useMocks ? mockApi : realApi;
