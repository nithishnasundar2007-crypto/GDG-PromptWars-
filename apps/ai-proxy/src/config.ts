// PRD §7 — ai-proxy config. The Gemini key lives ONLY here — nowhere in
// apps/web. See docs/PHASE0_AUDIT.md sections I (conflict 1) and J. Every
// value is validated with zod (hard rule §3.2: "every external boundary...
// validated with zod") rather than trusted as an unchecked string.

import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 8787)),
  RATE_LIMIT_PER_MIN: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 60)),
  // App Check enforcement is genuinely unverifiable in this sandbox (no live
  // Firebase project/credentials — see docs/SECURITY.md). An explicit
  // "true"/"false" always wins; left unset, the safe default flips on
  // NODE_ENV so a real deployment doesn't need to remember to turn this off
  // — only local/test runs (NODE_ENV !== "production") bypass by default.
  APP_CHECK_DEV_BYPASS: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? process.env.NODE_ENV !== "production" : v !== "false")),
  FIREBASE_PROJECT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid ai-proxy environment configuration: ${parsed.error.message}`);
}

export const config = {
  geminiApiKey: parsed.data.GEMINI_API_KEY,
  geminiModel: parsed.data.GEMINI_MODEL,
  allowedOrigin: parsed.data.ALLOWED_ORIGIN,
  port: parsed.data.PORT,
  rateLimitPerMin: parsed.data.RATE_LIMIT_PER_MIN,
  appCheckDevBypass: parsed.data.APP_CHECK_DEV_BYPASS,
  firebaseProjectId: parsed.data.FIREBASE_PROJECT_ID,
} as const;

// Keep in sync with apps/web/src/contracts/types.ts CONTRACT_VERSION.
// Duplicated (not imported) because ai-proxy is a separate deployable
// package from apps/web — a contract test in apps/web asserts they match
// (docs/PHASE0_AUDIT.md section N).
export const CONTRACT_VERSION = "1.0.0";
