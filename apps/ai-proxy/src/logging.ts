// PRD §8.5 (Risks) — privacy discipline for logs (hard rule §3.2): ids,
// lengths, latencies, prompt ids/versions and outcomes only — never answer
// text, project text, audio, or keys. Mirrors the same discipline already
// used in apps/web/src/grading/ai/index.ts's client-side logger.

interface ProxyCallLog {
  promptId: string;
  promptVersion: string;
  latencyMs: number;
  outcome: "ok" | "bad_json" | "failed" | "rejected";
  reason?: string; // a short code like "origin", "rate_limit", "app_check" — never request content
}

export function logProxyCall(entry: ProxyCallLog): void {
  // eslint-disable-next-line no-console -- this IS the logger; nothing else may use console directly.
  console.log(JSON.stringify({ at: new Date().toISOString(), ...entry }));
}
