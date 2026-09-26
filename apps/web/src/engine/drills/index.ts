// Owner: Uthai. getDrill(gapId) — selects the drill matched to the gap's
// type (PRD F6). The mapping itself (gap type -> drill kind) is data, kept
// alongside the seed bank in data/drills, not branching logic here.

import type { Drill } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";
import type { Repository } from "../store";

export function createDrillsModule(_repo: Repository) {
  return {
    async getDrill(_gapId: string): Promise<Drill> {
      throw new NotImplementedError("getDrill", "Uthai", "M1");
    },
  };
}
