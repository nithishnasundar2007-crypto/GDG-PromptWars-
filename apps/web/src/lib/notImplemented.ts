// Shared by every domain stub created during M0 scaffolding. Not a domain
// itself — just a marker so a call into unfinished M1 work fails loudly and
// says whose job it is, instead of silently returning undefined.
export class NotImplementedError extends Error {
  constructor(fn: string, owner: string, milestone: string) {
    super(`${fn}() is not implemented yet (owner: ${owner}, ${milestone}). See docs/TEAM_OWNERSHIP.md.`);
    this.name = "NotImplementedError";
  }
}
