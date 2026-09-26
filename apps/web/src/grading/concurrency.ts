// PRD F9 — Proof-Based Grading: a tiny, dependency-free concurrency-capped
// map, used to run Verifier calls in parallel (hard rule §3.3,
// VERIFIER_CONCURRENCY) without ever exceeding the cap or losing input order.

/**
 * Runs `fn` over `items`, at most `limit` calls in flight at once, and
 * returns results in the same order as `items` (not completion order).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index] as T, index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
