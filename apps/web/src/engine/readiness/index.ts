// Owner: Uthai. getReadinessMap and getCellEvidence — always DERIVED from
// Attempt[] + Gap[] via the Repository, never stored as a score (PRD F5 /
// docs/PHASE0_AUDIT.md section H). Column count: 4 technical columns
// (hint folds into recognize) per the flagged conflict in
// docs/PHASE0_AUDIT.md section I — confirm with the team before changing.

import type { CellEvidence, ReadinessMap } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";
import type { Repository } from "../store";

export function createReadinessModule(_repo: Repository) {
  return {
    async getReadinessMap(_studentId: string): Promise<ReadinessMap> {
      throw new NotImplementedError("getReadinessMap", "Uthai", "M1");
    },
    async getCellEvidence(
      _studentId: string,
      _topicId: string,
      _step: import("../../contracts").AnyStep,
    ): Promise<CellEvidence> {
      throw new NotImplementedError("getCellEvidence", "Uthai", "M1");
    },
  };
}
