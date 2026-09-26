// PRD F8 — Project Defense: per-session cache for generateProjectQuestions,
// keyed by SHA-256 of the normalised project text (hard rule §3.3). In
// memory only — cleared on tab reload, never persisted, never shared across
// sessions. Uses the Web Crypto API (available in every browser target and
// in Vitest's environment), so no extra hashing dependency is needed.

import type { ProjectQuestion } from "../../contracts";

const cache = new Map<string, ProjectQuestion[]>();

function normaliseForHash(projectText: string): string {
  return projectText.trim().replace(/\s+/g, " ").toLowerCase();
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns a cached result for this project text (by content hash), if any. */
export async function getCachedQuestions(projectText: string): Promise<ProjectQuestion[] | undefined> {
  const key = await sha256Hex(normaliseForHash(projectText));
  return cache.get(key);
}

/** Stores `questions` under this project text's content hash for the session. */
export async function setCachedQuestions(projectText: string, questions: ProjectQuestion[]): Promise<void> {
  const key = await sha256Hex(normaliseForHash(projectText));
  cache.set(key, questions);
}

/** Test-only: clears the cache between test cases. */
export function clearProjectQuestionCache(): void {
  cache.clear();
}
