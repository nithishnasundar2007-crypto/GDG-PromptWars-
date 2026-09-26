// PRD F9 — Proof-Based Grading: matchQuote (API Contract §3.2). A Grader span
// is only trusted if it is actually present in the student's own answer —
// this is an authoritative rule the Verifier can never override
// (docs/PHASE0_AUDIT.md section F). Grammar, spelling and language mix are
// never grading criteria (PRD §7.2 rule 7); `normalise` already ignores them.
//
// Matching strategy: exact normalised substring match first (O(n)); only a
// span long enough to carry real content (>= 3 words AND >= 12 chars) falls
// back to bounded fuzzy matching over token-count windows sized 0.8x-1.2x the
// span's own token count. Trivial short spans must match exactly, so a
// one-or-two-word span can't be "fuzzy-matched" onto unrelated text.

import { distance } from "fastest-levenshtein";
import {
  QUOTE_MIN_FUZZY_CHARS,
  QUOTE_MIN_FUZZY_WORDS,
  QUOTE_SIMILARITY_THRESHOLD,
  QUOTE_WINDOW_MAX_RATIO,
  QUOTE_WINDOW_MIN_RATIO,
} from "../config";
import { normalise, tokenize } from "./normalize";

export interface QuoteMatch {
  matched: boolean;
  similarity: number;
}

function similarityOf(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a, b) / maxLen;
}

/** Distinct window sizes (in tokens) between 0.8x and 1.2x of `spanWords`. */
function windowSizes(spanWords: number): number[] {
  const min = Math.max(1, Math.floor(spanWords * QUOTE_WINDOW_MIN_RATIO));
  const max = Math.max(min, Math.ceil(spanWords * QUOTE_WINDOW_MAX_RATIO));
  const sizes: number[] = [];
  for (let size = min; size <= max; size++) sizes.push(size);
  return sizes;
}

/** Per-token character start offset into the (single-space-joined) normalised answer. */
interface TokenIndex {
  text: string;
  starts: number[]; // starts[i] = char offset of token i; starts[tokens.length] = text.length
}

function buildTokenIndex(normAnswer: string, tokens: string[]): TokenIndex {
  const starts: number[] = [];
  let offset = 0;
  for (const token of tokens) {
    starts.push(offset);
    offset += token.length + 1; // +1 for the single joining space
  }
  starts.push(normAnswer.length);
  return { text: normAnswer, starts };
}

/** Extracts the substring covering tokens [start, start+size) without any array allocation. */
function windowText(index: TokenIndex, start: number, size: number): string {
  // `start` and `start + size` are always in [0, index.starts.length) by
  // construction (callers only ever pass windows inside the token count), so
  // these fallbacks are unreachable in practice — kept instead of a
  // non-null assertion so this stays a real bounds-safe read.
  const from = index.starts[start] ?? 0;
  const tokenCount = index.starts.length - 1;
  const nextStart = start + size < tokenCount ? index.starts[start + size] : undefined;
  const to = nextStart !== undefined ? nextStart - 1 : index.text.length;
  return index.text.slice(from, to);
}

/**
 * Scores one window size across the answer in two passes: a coarse pass at a
 * stride (cheap, keeps the perf budget on long answers) followed by a
 * single-step refinement around the coarse pass's best start, so a good
 * alignment a stride away from a grid point is never missed.
 */
function bestForWindowSize(normSpan: string, index: TokenIndex, tokenCount: number, size: number): number {
  const lastStart = tokenCount - size;
  if (lastStart < 0) return 0;

  const stride = Math.max(1, size);
  let best = 0;
  let bestStart = 0;
  for (let start = 0; start <= lastStart; start += stride) {
    const s = similarityOf(normSpan, windowText(index, start, size));
    if (s > best) {
      best = s;
      bestStart = start;
    }
    if (best === 1) return best;
  }

  const refineFrom = Math.max(0, bestStart - stride + 1);
  const refineTo = Math.min(lastStart, bestStart + stride - 1);
  for (let start = refineFrom; start <= refineTo; start++) {
    const s = similarityOf(normSpan, windowText(index, start, size));
    if (s > best) best = s;
    if (best === 1) return best;
  }
  return best;
}

function bestFuzzySimilarity(normSpan: string, normAnswer: string, answerTokens: string[]): number {
  const spanWords = tokenize(normSpan).length;
  const index = buildTokenIndex(normAnswer, answerTokens);
  let best = 0;
  for (const size of windowSizes(spanWords)) {
    const s = bestForWindowSize(normSpan, index, answerTokens.length, size);
    if (s > best) best = s;
    if (best === 1) break;
  }
  return best;
}

/**
 * Checks whether `span` (a Grader-produced quote) is actually present in
 * `answer`, ignoring case/punctuation/whitespace/Unicode-formatting
 * differences only. Pure and synchronous — never wrapped in `Result`.
 *
 * @param span the quoted text the Grader claims appears in the answer
 * @param answer the student's full answer text
 * @returns `matched` (similarity >= 0.9, or exact match for short spans) and
 *   the raw `similarity` in [0, 1] for logging/debugging.
 */
export function matchQuote(span: string, answer: string): QuoteMatch {
  const normSpan = normalise(span);
  if (normSpan.length === 0) return { matched: false, similarity: 0 };

  const normAnswer = normalise(answer);
  if (normAnswer.includes(normSpan)) return { matched: true, similarity: 1 };

  const spanWords = tokenize(normSpan).length;
  const isTrivialSpan = spanWords < QUOTE_MIN_FUZZY_WORDS || normSpan.length < QUOTE_MIN_FUZZY_CHARS;
  if (isTrivialSpan) {
    // Short spans must match exactly (no fuzzy fallback) — this blocks a
    // Grader/Verifier from "proving" a point with a trivial, ungameable span.
    return { matched: false, similarity: 0 };
  }

  const answerTokens = tokenize(normAnswer);
  const similarity = bestFuzzySimilarity(normSpan, normAnswer, answerTokens);
  return { matched: similarity >= QUOTE_SIMILARITY_THRESHOLD, similarity };
}
