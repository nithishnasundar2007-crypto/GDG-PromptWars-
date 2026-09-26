// Basic in-memory token bucket, per client IP. Enough for the MVP's single
// local student; not meant to survive a restart or scale across instances.
import { config } from "./config.js";

const buckets = new Map<string, { tokens: number; lastRefill: number }>();

const REFILL_MS = 60_000; // per minute

export function allow(clientId: string): boolean {
  const capacity = config.rateLimitPerMin;
  const now = Date.now();
  const bucket = buckets.get(clientId) ?? { tokens: capacity, lastRefill: now };

  const elapsed = now - bucket.lastRefill;
  if (elapsed > REFILL_MS) {
    bucket.tokens = capacity;
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
