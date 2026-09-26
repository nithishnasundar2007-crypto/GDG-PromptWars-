// The only place import.meta.env is read. Everything else imports `config`.
//
// Note on RUNNER_TIMEOUT_MS: the .env table names it without a VITE_ prefix,
// but Vite only exposes VITE_-prefixed variables to browser code (see
// docs/PHASE0_AUDIT.md, conflict 1, for why that boundary matters — the same
// mechanism is what keeps GEMINI_API_KEY out of the bundle). It's spelled
// VITE_RUNNER_TIMEOUT_MS here; .env.example documents the mapping.
import { z } from "zod";

const envSchema = z.object({
  VITE_USE_MOCKS: z
    .string()
    .optional()
    .transform((v) => v !== "false"), // default true
  VITE_SCOPE: z.enum(["sprint", "two-week"]).default("sprint"),
  VITE_AI_PROXY_URL: z.string().default("http://localhost:8787"),
  VITE_RUNNER_TIMEOUT_MS: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 8000)),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const config = {
  useMocks: parsed.data.VITE_USE_MOCKS,
  scope: parsed.data.VITE_SCOPE,
  aiProxyUrl: parsed.data.VITE_AI_PROXY_URL,
  runnerTimeoutMs: parsed.data.VITE_RUNNER_TIMEOUT_MS,
} as const;

export type Config = typeof config;
