// Owner: Uthai. saveDebrief — two-week scope only (PRD F11). Rebuilds each
// logged question as a Probe Ladder and re-asks the parts the student
// struggled with; gaps found are added to the plan for the next drive.

import type { Debrief, Gap } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";
import type { Repository } from "../store";

export function createDebriefModule(_repo: Repository) {
  return {
    async saveDebrief(
      _input: Omit<Debrief, "id" | "gapIds">,
    ): Promise<{ debrief: Debrief; gaps: Gap[] }> {
      throw new NotImplementedError("saveDebrief", "Uthai", "M1 (two-week scope)");
    },
  };
}
