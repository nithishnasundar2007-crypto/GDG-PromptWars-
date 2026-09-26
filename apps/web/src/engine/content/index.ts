// Owner: Uthai. Loaders and validation for the seed bank (data/) and round
// maps. M1 work: read data/companies/*.json + data/questions/**/*.json,
// validate against scripts/validate-seeds' rules, and serve them here.

import type { Company, Topic } from "../../contracts";
import { NotImplementedError } from "../../lib/notImplemented";

export async function getCompanies(): Promise<Company[]> {
  throw new NotImplementedError("getCompanies", "Uthai", "M1");
}

export async function getRoundMap(
  _companyId: string,
): Promise<{ company: Company; topics: Topic[] }> {
  throw new NotImplementedError("getRoundMap", "Uthai", "M1");
}
