// Owner: Uthai. getDrill(gapId) — selects the drill matched to the gap's
// type (PRD F6). The mapping itself (gap type -> drill kind, and the drill
// text) is data in data/drills, not branching logic here. Finishing a drill
// never changes a gap: only a fresh re-test can (engine/gaps).

import type { Drill, Gap } from "../../contracts";
import { drillKindFor, drillTemplateFor } from "../content";
import { EngineError } from "../errors";
import type { Repository } from "../store";

/** Pure: the drill for a gap, preferring one written for its topic, else the generic one for its type. */
export function buildDrill(gap: Gap): Drill {
  const template = drillTemplateFor(gap.topicId, gap.type);
  if (!template) throw new EngineError("NOT_FOUND", `No drill exists for a ${gap.type} gap.`);
  return {
    id: `dr_${gap.id}`,
    gapId: gap.id,
    topicId: gap.topicId,
    gapType: gap.type,
    kind: drillKindFor(gap.type),
    title: template.title,
    content: template.content,
    minutes: template.minutes,
    ...(template.questionIds ? { questionIds: template.questionIds } : {}),
  };
}

export function createDrillsModule(repo: Repository) {
  return {
    async getDrill(gapId: string): Promise<Drill> {
      const gap = await repo.getGap(gapId);
      if (!gap) throw new EngineError("NOT_FOUND", `Unknown gap "${gapId}".`);
      if (gap.status === "fixed") {
        throw new EngineError("INVALID_STEP", "That gap is already fixed, so there is nothing to drill.");
      }
      return buildDrill(gap);
    },
  };
}
