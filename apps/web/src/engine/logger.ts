// PRD §8.5 (Risks) — the one place engine code may use console.*, mirroring
// the same discipline as grading/ai/index.ts and apps/ai-proxy/src/logging.ts:
// operational signals only (what failed, not student data), so an engine
// module never reaches for console.* directly.

export function logEngineWarning(message: string, error: unknown): void {
  console.warn(`[engine] ${message}`, error instanceof Error ? error.message : error);
}
