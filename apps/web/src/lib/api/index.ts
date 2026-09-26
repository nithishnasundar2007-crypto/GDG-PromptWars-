// The ONLY module screens ever import for data. Routes every one of the 17
// functions to either contracts/mocks.ts or the real engine/grading
// implementation, keyed on VITE_USE_MOCKS. Screens never import engine/* or
// grading/* directly (UI/UX Specs + the architect brief's frontend rules).

import type { CompassApi } from "../../contracts";
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
} from "../../engine";
import {
  initRunner,
  runSample,
  generateProjectQuestions,
  gradeProjectAnswer,
  transcribe,
} from "../../grading";
import { ok, err } from "../../contracts/errors";

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
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async getRoundMap(companyId) {
      try {
        return ok(await getRoundMap(companyId));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async createStudent(input) {
      try {
        return ok(await session.createStudent(input));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async startLadder(studentId, topicId, role, step) {
      try {
        return ok(await session.startLadder(studentId, topicId, role, step));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async submitStep(ladderId, answer, timeMs) {
      try {
        return ok(await session.submitStep(ladderId, answer, timeMs));
      } catch (e) {
        return err("INVALID_STEP", e instanceof Error ? e.message : undefined);
      }
    },
    async getReadinessMap(studentId) {
      try {
        return ok(await readiness.getReadinessMap(studentId));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async getCellEvidence(studentId, topicId, step) {
      try {
        return ok(await readiness.getCellEvidence(studentId, topicId, step));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async getPlan(studentId) {
      try {
        return ok(await planner.getPlan(studentId));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async getNextTask(studentId) {
      try {
        return ok(await planner.getNextTask(studentId));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async getDrill(gapId) {
      try {
        return ok(await drills.getDrill(gapId));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
    async completePlanItem(itemId, status) {
      try {
        return ok(await planner.completePlanItem(itemId, status));
      } catch (e) {
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
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
        return err("NOT_FOUND", e instanceof Error ? e.message : undefined);
      }
    },
  };
}

const realApi: CompassApi = buildRealApi();

export const api: CompassApi = config.useMocks ? mockApi : realApi;
