// PRD F9 — Proof-Based Grading: barrel for the quote matcher. See
// normalize.ts and match-quote.ts for the real logic; kept split so each
// file stays under the one-responsibility / <=200-line rule.

export { normalise, tokenize } from "./normalize";
export { matchQuote, type QuoteMatch } from "./match-quote";
