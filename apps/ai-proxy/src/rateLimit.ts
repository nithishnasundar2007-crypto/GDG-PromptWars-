// Basic in-memory token bucket, per client IP. Enough for the MVP's single
// local student; not meant to survive a restart or scale across instances.
const buckets = new Map<string, { tokens: number; lastRefill: number }>();

const CAPACITY = 30; // requests
const REFILL_MS = 60_000; // per minute

export function allow(clientId: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(clientId) ?? { tokens: CAPACITY, lastRefill: now };

  const elapsed = now - bucket.lastRefill;
  if (elapsed > REFILL_MS) {
    bucket.tokens = CAPACITY;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    buckets.set(clientId, bucket);
    return false;
  }

  bucket.tokens -= 1;
  buckets.set(clientId, bucket);
  return true;
}
