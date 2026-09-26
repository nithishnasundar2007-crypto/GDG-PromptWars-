// Owner: Suchit. matchQuote (API Contract §3.2): normalises case, spacing and
// punctuation, then fuzzy-matches a Grader span against the student's answer
// at similarity >= 0.9 (PRD §7 / §7.2, §9). This is an authoritative rule —
// a span the quote matcher rejects is never trusted, no matter what the
// Grader or Verifier says (docs/PHASE0_AUDIT.md section F).
//
// Grammar, spelling and language mix are never graded (PRD §7.2 rule 7): this
// normaliser deliberately does NOT penalise those, only checks the idea is
// actually present in the student's own words.

const SIMILARITY_THRESHOLD = 0.9;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation becomes a space, not nothing —
    // "level-by-level" must stay three words, not fuse into "levelbylevel"
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, used to derive a normalised similarity in [0, 1]. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1, // deletion
        curr[j - 1]! + 1, // insertion
        prev[j - 1]! + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Fuzzy-finds `span` as a contiguous window inside `answer`, both normalised
 * first. Slides a window of the span's own (normalised) length across the
 * answer and keeps the best similarity — this is what lets a tidied or
 * slightly reworded quote still match without rewarding a span that isn't
 * really there.
 */
export function matchQuote(span: string, answer: string): { matched: boolean; similarity: number } {
  const normSpan = normalise(span);
  const normAnswer = normalise(answer);

  if (normSpan.length === 0) return { matched: false, similarity: 0 };
  if (normAnswer.includes(normSpan)) return { matched: true, similarity: 1 };

  const baseLen = normSpan.length;
  let best = 0;
  // A short, fixed step (not scaled to windowLen) so a window still lands
  // close to the real content even when the answer has extra words spliced
  // in before it — insertions shift alignment by arbitrary amounts. A few
  // window-length variants (+/- a handful of chars) absorb the fact that
  // substituted words (e.g. "the" -> "da") rarely have exactly the same
  // length as the original.
  const step = Math.min(3, Math.max(1, Math.floor(baseLen / 10)));
  for (const windowLen of [baseLen - 4, baseLen - 2, baseLen, baseLen + 2, baseLen + 4]) {
    if (windowLen <= 0) continue;
    for (let start = 0; start <= Math.max(0, normAnswer.length - windowLen); start += step) {
      const window = normAnswer.slice(start, start + windowLen);
      const s = similarity(normSpan, window);
      if (s > best) best = s;
    }
    if (best === 1) break;
  }
  // Also check the whole-answer similarity in case the span is close to the
  // full answer's length (short answers, short spans).
  best = Math.max(best, similarity(normSpan, normAnswer));

  return { matched: best >= SIMILARITY_THRESHOLD, similarity: best };
}
