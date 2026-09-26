// Owner: Uthai. The next-task rule (PRD 7.3), stated as data-driven priority,
// not invented scores: (1) confirmed gaps first, by topic weight, lowest
// failed step; (2) suspected gaps get one confirmation probe; (3) untested
// high-weight topics get a first probe; (4) repeat until the day's time
// budget is used. This is an authoritative rule — never delegated to the LLM.

import type { Plan, PlanItem } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";
import type { Repository } from "../store";

export function createPlannerModule(_repo: Repository) {
  return {
    async replan(_studentId: string): Promise<Plan> {
      throw new NotImplementedError("replan", "Uthai", "M1");
    },
    async getPlan(_studentId: string): Promise<Plan> {
      throw new NotImplementedError("getPlan", "Uthai", "M1");
    },
    async getNextTask(_studentId: string): Promise<PlanItem> {
      throw new NotImplementedError("getNextTask", "Uthai", "M1");
    },
    async completePlanItem(_itemId: string, _status: "done" | "skipped"): Promise<Plan> {
      throw new NotImplementedError("completePlanItem", "Uthai", "M1");
    },
  };
}
