// PRD F9 — Proof-Based Grading: text normalisation shared by the quote
// matcher. Deliberately does NOT touch grammar, spelling, or language mix
// (PRD §7.2 rule 7) — it only removes formatting noise (case, punctuation,
// curly quotes/dashes, whitespace, Unicode compatibility variants) so the
// same idea typed two different ways still compares equal.

/**
 * Maps visually/semantically equivalent punctuation onto a single ASCII form
 * before NFKC normalisation, so a curly quote and a straight quote (or an
 * em-dash and a hyphen) never cause a spurious mismatch.
 */
const PUNCTUATION_EQUIVALENTS: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "–": "-",
  "—": "-",
  "―": "-",
  "−": "-",
};

function normalisePunctuation(text: string): string {
  let out = text;
  for (const [from, to] of Object.entries(PUNCTUATION_EQUIVALENTS)) {
    out = out.split(from).join(to);
  }
  return out;
}

/**
 * Normalises `text` for quote comparison: NFKC Unicode normalisation, curly
 * quote/dash folding, lowercasing, punctuation collapsed to single spaces
 * (not removed — "level-by-level" must stay three tokens, not fuse into one),
 * and whitespace collapsed.
 */
export function normalise(text: string): string {
  return normalisePunctuation(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits already-normalised text into whitespace-delimited tokens. */
export function tokenize(normalised: string): string[] {
  return normalised.length === 0 ? [] : normalised.split(" ");
}
