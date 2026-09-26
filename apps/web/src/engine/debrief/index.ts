// Owner: Uthai. saveDebrief — two-week scope (PRD F11). A logged real-round
// question is matched to a seed topic by keyword; if the student's note shows
// they struggled, that topic gets a suspected gap (a second struggle confirms
// it, exactly as in the ladder). The planner then schedules a confirmation
// probe, which re-asks the topic as a real Probe Ladder graded by the normal
// pipeline. The engine does not grade free text itself (that is grading's job),
// so "struggled" is read only from the student's own words.

import type { Debrief, Gap, GapType, HrStepId, Student, StepId } from "../../contracts";
import { nowOf, parseIsoDate, type EngineDeps } from "../deps";
import { EngineError } from "../errors";
import { debriefKeywords, findCompany, getTopic, topicWeights } from "../content";
import { updateGaps } from "../gaps";
import { createPlannerModule } from "../planner";
import type { Repository } from "../store";

const STRUGGLE = /\b(don'?t know|do not know|didn'?t know|did not know|couldn'?t|could not|can'?t|cannot|no idea|blank|forgot|forgotten|not sure|unable|struggled|stuck|wrong|failed|froze)\b/i;
const FORGOT = /\b(forgot|forgotten|blank|froze)\b/i;

export function looksStruggled(answer: string): boolean {
  return answer.trim() === "" || STRUGGLE.test(answer);
}

/** The seed topic (among `candidateTopicIds`) whose keywords best match the question, if any. */
export function matchTopic(question: string, candidateTopicIds: string[], weights: Map<string, number>): string | undefined {
  const text = question.toLowerCase();
  const keywords = debriefKeywords();
  let best: { id: string; score: number } | undefined;
  for (const id of candidateTopicIds) {
    const score = (keywords[id] ?? []).filter((k) => text.includes(k)).length;
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && (weights.get(id) ?? 0) > (weights.get(best.id) ?? 0))) {
      best = { id, score };
    }
  }
  return best?.id;
}

export function createDebriefModule(repo: Repository, deps: EngineDeps = {}) {
  const planner = createPlannerModule(repo, deps);

  return {
    async saveDebrief(input: Omit<Debrief, "id" | "gapIds">): Promise<{ debrief: Debrief; gaps: Gap[] }> {
      const student: Student | undefined = await repo.getStudent(input.studentId);
      if (!student) throw new EngineError("NOT_FOUND", `Unknown student "${input.studentId}".`);
      const company = findCompany(input.companyId, student.scope);
      if (!company) throw new EngineError("NOT_FOUND", `Unknown company "${input.companyId}".`);
      if (typeof input.roundName !== "string" || input.roundName.trim() === "") {
        throw new EngineError("INVALID_STEP", "A debrief needs a round name.");
      }
      if (!parseIsoDate(input.date)) throw new EngineError("INVALID_STEP", "Debrief date must be YYYY-MM-DD.");
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw new EngineError("INVALID_STEP", "A debrief needs at least one question.");
      }
      if (input.items.some((i) => typeof i.question !== "string" || i.question.trim() === "")) {
        throw new EngineError("INVALID_STEP", "Every debrief question needs text.");
      }

      const round = company.rounds.find((r) => r.name.toLowerCase() === input.roundName.trim().toLowerCase());
      const weights = topicWeights(company);
      const candidates = round ? round.topics.map((t) => t.topicId) : [...weights.keys()];

      const debriefId = repo.nextId("db");
      let gaps = await repo.getGaps(student.id);
      const touched = new Set<string>();
      const at = nowOf(deps).toISOString();

      input.items.forEach((item, index) => {
        const topicId = matchTopic(item.question, candidates, weights);
        const topic = topicId ? getTopic(topicId) : undefined;
        if (!topic || !looksStruggled(item.answer ?? "")) return;

        const isHr = topic.track === "hr";
        const step: StepId | HrStepId = isHr ? "structure" : "recognize";
        const type: GapType = isHr ? "structure" : FORGOT.test(item.answer ?? "") ? "recall" : "concept";
        const before = gaps;
        gaps = updateGaps(gaps, {
          studentId: student.id,
          topicId: topic.id,
          step,
          type,
          passed: false,
          assisted: false,
          // No graded attempt exists for a real interview question; the debrief item stands in as evidence.
          attemptId: `${debriefId}_${index}`,
          isRetestOnFreshQuestion: true,
          at,
        });
        for (const g of gaps) if (!before.includes(g)) touched.add(g.id);
      });

      const changed = gaps.filter((g) => touched.has(g.id));
      for (const gap of changed) await repo.upsertGap(gap);

      const debrief: Debrief = { ...input, id: debriefId, gapIds: changed.map((g) => g.id) };
      await repo.saveDebrief(debrief);
      await planner.replan(student.id);
      return { debrief, gaps: changed };
    },
  };
}
